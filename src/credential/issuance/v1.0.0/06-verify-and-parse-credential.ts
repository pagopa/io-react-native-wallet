import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { CBOR } from "@pagopa/io-react-native-iso18013";
import type { PublicKey } from "@pagopa/io-react-native-crypto";
import { type SDJwt, SDJwtInstance } from "@sd-jwt/core";
import { digest } from "@sd-jwt/crypto-nodejs";
import { type Out } from "../../../utils/misc";
import { IoWalletError } from "../../../utils/errors";
import { SdJwt4VC, verify as verifySdJwt } from "../../../sd-jwt";
import { isSameThumbprint, type JWK } from "../../../utils/jwk";
import {
  getParsedCredentialClaimKey,
  verify as verifyMdoc,
} from "../../../mdoc";
import { MDOC_DEFAULT_NAMESPACE } from "../../../mdoc/const";
import { Logger, LogLevel } from "../../../utils/logging";
import { extractElementValueAsDate } from "../../../mdoc/converter";
import { isPathEqual, isPrefixOf } from "../../../utils/parser";
import type { VerifyAndParseCredentialApi } from "../api/06-verify-and-parse-credential";
import type { IssuerConfig, ParsedCredential } from "../api";

type CredentialConf =
  IssuerConfig["credential_configurations_supported"][string];

type DecodedMDocCredential = Out<typeof verifyMdoc> & {
  issuerSigned: CBOR.IssuerSigned;
};

/**
 * Parse a Sd-Jwt credential according to the issuer configuration
 * @param credentialConfig - the list of supported credentials, as defined in the issuer configuration with their claims metadata
 * @param parsedCredentialRaw - the raw parsed credential
 * @param ignoreMissingAttributes - skip error when attributes declared in the issuer configuration are not found within disclosures
 * @param includeUndefinedAttributes - include attributes not explicitly declared in the issuer configuration
 * @returns The parsed credential with attributes in plain value
 */
const parseCredentialSdJwt = (
  credentialConfig: CredentialConf,
  parsedCredentialRaw: Record<string, unknown>,
  ignoreMissingAttributes: boolean = false,
  includeUndefinedAttributes: boolean = false
): ParsedCredential => {
  const claimsMetadata = credentialConfig.claims || [];

  // Check that all mandatory attributes defined in the issuer configuration are present in the credential
  if (!ignoreMissingAttributes) {
    const missingPaths: string[] = [];
    const rootKeysToVerify = new Set(
      claimsMetadata
        .map((c) => c.path[0])
        .filter((p): p is string => typeof p === "string")
    );

    for (const rootKey of rootKeysToVerify) {
      if (!(rootKey in parsedCredentialRaw)) {
        missingPaths.push(rootKey);
      }
    }

    if (missingPaths.length > 0) {
      const missing = missingPaths.join(", ");
      const received = Object.keys(parsedCredentialRaw).join(", ");
      throw new IoWalletError(
        `Some attributes are missing in the credential. Missing: [${missing}], received: [${received}]`
      );
    }
  }

  /**
   * Helper to find display metadata for any given path
   */
  const getDisplayNames = (
    path: (string | number | null)[]
  ): Record<string, string> | undefined => {
    const match = claimsMetadata.find((c) => isPathEqual(c.path, path));
    if (!match) return undefined;

    const nameMap: Record<string, string> = {};
    for (const entry of match.display) {
      nameMap[entry.locale] = entry.name;
    }
    return nameMap;
  };

  /**
   * Recursive function to build the localized structure
   */
  const processLevel = (
    currentData: unknown,
    currentPath: (string | number | null)[]
  ): unknown => {
    // Handle Arrays
    if (Array.isArray(currentData)) {
      return currentData.map((item) =>
        processLevel(item, [...currentPath, null])
      );
    }

    // Handle Objects
    if (typeof currentData !== "object" || currentData === null) {
      return currentData;
    }

    const dataObj = currentData as Record<string, unknown>;
    const result: ParsedCredential = {};
    const processedKeys = new Set<string | number>();

    // Identify unique keys in config at this level
    const configKeysAtThisLevel: (string | number)[] = [];
    for (const claim of claimsMetadata) {
      // Check if the claim path starts with the current path
      if (isPrefixOf(currentPath, claim.path)) {
        const nextPart = claim.path[currentPath.length];
        if (
          (typeof nextPart === "string" || typeof nextPart === "number") &&
          !configKeysAtThisLevel.includes(nextPart)
        ) {
          configKeysAtThisLevel.push(nextPart);
        }
      }
    }

    // Process keys
    for (const key of configKeysAtThisLevel) {
      const stringKey = key.toString();
      const dataValue = dataObj[stringKey];
      if (dataValue === undefined) continue;

      const newPath = [...currentPath, key];

      let localizedNames = getDisplayNames(newPath);

      // Fallback for arrays
      if (!localizedNames && Array.isArray(dataValue)) {
        localizedNames = getDisplayNames([...newPath, null]);
      }

      result[stringKey] = {
        name: localizedNames || stringKey,
        value: processLevel(dataValue, newPath),
      };

      processedKeys.add(key);
    }

    // Handle Undefined Attributes
    if (includeUndefinedAttributes) {
      for (const [key, value] of Object.entries(dataObj)) {
        if (!processedKeys.has(key)) {
          result[key] = {
            name: key,
            value: value,
          };
        }
      }
    }

    return result;
  };

  return processLevel(parsedCredentialRaw, []) as ParsedCredential;
};

const parseCredentialMDoc = (
  // the list of supported credentials, as defined in the issuer configuration
  credentialConfig: CredentialConf,
  // credential_type: string,
  { issuerSigned }: DecodedMDocCredential,
  ignoreMissingAttributes: boolean = false,
  includeUndefinedAttributes: boolean = false
): ParsedCredential => {
  if (!credentialConfig) {
    throw new IoWalletError("Credential type not supported by the issuer");
  }

  if (!credentialConfig.claims) {
    throw new IoWalletError("Missing claims in the credential subject");
  }

  const attrDefinitions = credentialConfig.claims.map<
    [string, string, { name: string; locale: string }[]]
  >(({ path: [namespace, attribute], display }) => [
    namespace as string,
    attribute as string,
    display,
  ]);

  if (!issuerSigned.nameSpaces) {
    throw new IoWalletError("Missing claims in the credential");
  }

  const flatNamespaces = Object.entries(issuerSigned.nameSpaces).flatMap(
    ([namespace, values]) =>
      values.map<[string, string, string]>((v) => [
        namespace,
        v.elementIdentifier,
        v.elementValue,
      ])
  );

  // Check that all mandatory attributes defined in the issuer configuration are present in the disclosure set
  // and filter the non present ones
  const attrsNotInDisclosures = attrDefinitions.filter(
    ([attrDefNamespace, attrKey]) =>
      !flatNamespaces.some(
        ([namespace, claim]) =>
          attrDefNamespace === namespace && attrKey === claim
      )
  );

  if (attrsNotInDisclosures.length > 0) {
    const missing = attrsNotInDisclosures
      .map(([, attrKey]) => attrKey)
      .join(", ");
    const received = flatNamespaces.map(([, attrKey]) => attrKey).join(", ");

    if (!ignoreMissingAttributes) {
      throw new IoWalletError(
        `Some attributes are missing in the credential. Missing: [${missing}], received: [${received}]`
      );
    }
  }

  // Attributes defined in the issuer configuration and present in the disclosure set
  const definedValues = attrDefinitions
    // Retrieve the value from the corresponding disclosure
    .map(
      ([attrDefNamespace, attrKey, display]) =>
        [
          attrDefNamespace,
          attrKey,
          {
            display,
            value: flatNamespaces.find(
              ([namespace, name]) =>
                attrDefNamespace === namespace && name === attrKey
            )?.[2],
          },
        ] as const
    )
    //filter the not found elements
    .filter(([_, __, definition]) => definition.value !== undefined)
    // Add a human-readable attribute name, with i18n, in the form { locale: name }
    // Example: { "it-IT": "Nome", "en-EN": "Name", "es-ES": "Nombre" }
    .reduce<ParsedCredential>(
      (acc, [attrDefNamespace, attrKey, { display, value }]) => ({
        ...acc,
        [getParsedCredentialClaimKey(attrDefNamespace, attrKey)]: {
          value,
          name: display.reduce(
            (names, { locale, name }) => ({
              ...names,
              [locale]: name,
            }),
            {}
          ),
        },
      }),
      {}
    );

  if (includeUndefinedAttributes) {
    const undefinedValues: ParsedCredential = Object.fromEntries(
      Object.values(flatNamespaces)
        .filter(
          ([namespace, key]) =>
            !definedValues[getParsedCredentialClaimKey(namespace, key)]
        )
        .map(([namespace, key, value]) => [
          getParsedCredentialClaimKey(namespace, key),
          { value, name: key },
        ])
    );
    return {
      ...definedValues,
      ...undefinedValues,
    };
  }

  return definedValues;
};
/**
 * Given a credential, verify it's in the supported format
 * and the credential is correctly signed
 * and it's bound to the given key
 *
 * @param rawCredential The received credential
 * @param issuerKeys The set of public keys of the issuer,
 * which will be used to verify the signature
 * @param holderBindingContext The access to the holder's key
 *
 * @throws If the signature verification fails
 * @throws If the credential is not in the SdJwt4VC format
 * @throws If the holder binding is not properly configured
 *
 */
async function verifyCredentialSdJwt(
  rawCredential: string,
  issuerKeys: JWK[],
  holderBindingContext: CryptoContext
): Promise<SDJwt> {
  // TODO: change verification using sd-jwt library with 1.3.x update
  const [decodedCredential, holderBindingKey] =
    // parallel for optimization
    await Promise.all([
      verifySdJwt(rawCredential, issuerKeys, SdJwt4VC),
      holderBindingContext.getPublicKey(),
    ]);

  const { cnf } = decodedCredential.sdJwt.payload;
  if (!(await isSameThumbprint(cnf.jwk, holderBindingKey as JWK))) {
    const message = `Failed to verify holder binding, expected kid: ${holderBindingKey.kid}, got: ${decodedCredential.sdJwt.payload.cnf.jwk.kid}`;
    Logger.log(LogLevel.ERROR, message);
    throw new IoWalletError(message);
  }

  const sdJwtInstance = new SDJwtInstance({
    hasher: digest,
  });

  return await sdJwtInstance.decode(rawCredential);
}

/**
 * Given a credential, verify it's in the supported format
 * and the credential is correctly signed
 * and it's bound to the given key
 *
 * @param rawCredential The received credential
 * @param x509CertRoot The root certificate of the issuer,
 * which will be used to verify the signature
 * @param holderBindingContext The access to the holder's key
 *
 * @throws If the signature verification fails
 * @throws If the credential is not in the SdJwt4VC format
 * @throws If the holder binding is not properly configured
 *
 */
async function verifyCredentialMDoc(
  rawCredential: string,
  x509CertRoot: string,
  holderBindingContext: CryptoContext
): Promise<DecodedMDocCredential> {
  const [decodedCredential, holderBindingKey] =
    // parallel for optimization
    await Promise.all([
      verifyMdoc(rawCredential, x509CertRoot),
      holderBindingContext.getPublicKey(),
    ]);

  if (!decodedCredential) {
    throw new IoWalletError("No MDOC credentials found!");
  }

  const key =
    decodedCredential.issuerSigned.issuerAuth.payload.deviceKeyInfo.deviceKey;

  if (!(await isSameThumbprint(key, holderBindingKey as PublicKey))) {
    throw new IoWalletError(
      `Failed to verify holder binding, holder binding key and mDoc deviceKey don't match`
    );
  }

  return decodedCredential;
}

const verifyAndParseCredentialSdJwt: VerifyAndParseCredentialApi["verifyAndParseCredential"] =
  async (
    issuerConf,
    credential,
    credentialConfigurationId,
    {
      credentialCryptoContext,
      ignoreMissingAttributes,
      includeUndefinedAttributes,
    }
  ) => {
    const decoded = await verifyCredentialSdJwt(
      credential,
      issuerConf.keys,
      credentialCryptoContext
    );

    Logger.log(
      LogLevel.DEBUG,
      `Decoded credential: ${JSON.stringify(decoded)}`
    );

    const credentialConfig =
      issuerConf.credential_configurations_supported[credentialConfigurationId];

    if (!credentialConfig) {
      Logger.log(
        LogLevel.ERROR,
        `Credential type not supported by the issuer: ${credentialConfigurationId}`
      );
      throw new IoWalletError("Credential type not supported by the issuer");
    }

    const parsedCredentialRaw = (await decoded.getClaims(digest)) as Record<
      string,
      unknown
    >;

    const parsedCredential = parseCredentialSdJwt(
      credentialConfig,
      parsedCredentialRaw,
      ignoreMissingAttributes,
      includeUndefinedAttributes
    );

    const issuedAt =
      typeof parsedCredentialRaw.iat === "number"
        ? new Date(parsedCredentialRaw.iat * 1000)
        : undefined;

    if (typeof parsedCredentialRaw.exp !== "number") {
      throw new IoWalletError("Invalid or missing expiration claim (exp)");
    }
    const expiration = new Date(parsedCredentialRaw.exp * 1000);

    Logger.log(
      LogLevel.DEBUG,
      `Parsed credential: ${JSON.stringify(parsedCredential)}\nIssued at: ${issuedAt}`
    );

    return {
      parsedCredential,
      expiration,
      issuedAt,
    };
  };

const verifyAndParseCredentialMDoc: VerifyAndParseCredentialApi["verifyAndParseCredential"] =
  async (
    issuerConf,
    credential,
    credentialConfigurationId,
    { credentialCryptoContext, ignoreMissingAttributes },
    x509CertRoot
  ) => {
    if (!x509CertRoot) {
      throw new IoWalletError("Missing x509CertRoot");
    }

    const decoded = await verifyCredentialMDoc(
      credential,
      x509CertRoot,
      credentialCryptoContext
    );

    const credentialConfig =
      issuerConf.credential_configurations_supported[
        credentialConfigurationId
      ]!;
    const parsedCredential = parseCredentialMDoc(
      credentialConfig,
      decoded,
      ignoreMissingAttributes,
      ignoreMissingAttributes
    );

    const expirationDate = extractElementValueAsDate(
      parsedCredential?.[
        getParsedCredentialClaimKey(MDOC_DEFAULT_NAMESPACE, "expiry_date")
      ]?.value as string
    );
    if (!expirationDate) {
      throw new IoWalletError(`expirationDate must be present!!`);
    }
    expirationDate.setDate(expirationDate.getDate() + 1);

    const maybeIssuedAt = extractElementValueAsDate(
      parsedCredential?.[
        getParsedCredentialClaimKey(MDOC_DEFAULT_NAMESPACE, "issue_date")
      ]?.value as string
    );
    maybeIssuedAt?.setDate(maybeIssuedAt.getDate() + 1);

    return {
      parsedCredential,
      credential,
      credentialConfigurationId,
      expiration: expirationDate,
      issuedAt: maybeIssuedAt ?? undefined,
    };
  };

/* -------------------- Public API implementation -------------------- */

export const verifyAndParseCredential: VerifyAndParseCredentialApi["verifyAndParseCredential"] =
  async (
    issuerConf,
    credential,
    credentialConfigurationId,
    context,
    x509CertRoot
  ) => {
    const format =
      issuerConf.credential_configurations_supported[credentialConfigurationId]
        ?.format;

    switch (format) {
      case "dc+sd-jwt": {
        Logger.log(LogLevel.DEBUG, "Parsing credential in dc+sd-jwt format");
        return verifyAndParseCredentialSdJwt(
          issuerConf,
          credential,
          credentialConfigurationId,
          context
        );
      }
      case "mso_mdoc": {
        Logger.log(LogLevel.DEBUG, "Parsing credential in mso_mdoc format");
        return verifyAndParseCredentialMDoc(
          issuerConf,
          credential,
          credentialConfigurationId,
          context,
          x509CertRoot
        );
      }

      default: {
        const message = `Unsupported credential format: ${format}`;
        Logger.log(LogLevel.ERROR, message);
        throw new IoWalletError(message);
      }
    }
  };
