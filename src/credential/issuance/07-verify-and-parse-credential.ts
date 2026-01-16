import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { type Out } from "../../utils/misc";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { IoWalletError } from "../../utils/errors";
import { SdJwt4VC, verify as verifySdJwt } from "../../sd-jwt";
import { isSameThumbprint, type JWK } from "../../utils/jwk";
import type { ObtainCredential } from "./06-obtain-credential";
import { verify as verifyMdoc } from "../../mdoc";
import { MDOC_DEFAULT_NAMESPACE } from "../../mdoc/const";
import { getParsedCredentialClaimKey } from "../../mdoc/utils";
import { Logger, LogLevel } from "../../utils/logging";
import { extractElementValueAsDate } from "../../mdoc/converter";
import type { CBOR } from "@pagopa/io-react-native-iso18013";
import type { PublicKey } from "@pagopa/io-react-native-crypto";
import { type SDJwt, SDJwtInstance } from "@sd-jwt/core";
import { digest } from "@sd-jwt/crypto-nodejs";

type IssuerConf = Out<EvaluateIssuerTrust>["issuerConf"];
type CredentialConf =
  IssuerConf["openid_credential_issuer"]["credential_configurations_supported"][string];

type DecodedMDocCredential = Out<typeof verifyMdoc> & {
  issuerSigned: CBOR.IssuerSigned;
};

export type VerifyAndParseCredential = (
  issuerConf: IssuerConf,
  credential: Out<ObtainCredential>["credential"],
  credentialConfigurationId: string,
  context: {
    credentialCryptoContext: CryptoContext;
    /**
     * Do not throw an error when an attribute is not found within disclosures.
     */
    ignoreMissingAttributes?: boolean;
    /**
     * Include attributes that are not explicitly mapped in the issuer configuration.
     */
    includeUndefinedAttributes?: boolean;
  },
  x509CertRoot?: string
) => Promise<{
  parsedCredential: ParsedCredential;
  expiration: Date;
  issuedAt: Date | undefined;
}>;

// The credential as a collection of attributes in plain value
type ParsedCredential = {
  /** Attribute key */
  [claim: string]: {
    name:
      | /* if i18n is provided */ Record<
          string /* locale */,
          string /* value */
        >
      | /* if no i18n is provided */ string
      | undefined; // Add undefined as a possible value for the name property
    value: unknown;
  };
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
        .filter((p): p is string => p !== null)
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

  const getDisplayMetadata = (currentPath: (string | null)[]) => {
    return claimsMetadata.find((claim) => {
      const cleanConfigPath = claim.path.filter((p) => p !== null);
      const cleanCurrentPath = currentPath.filter((p) => p !== null);

      if (cleanConfigPath.length !== cleanCurrentPath.length) return false;
      return cleanConfigPath.every(
        (part, index) => part === cleanCurrentPath[index]
      );
    })?.display;
  };

  const processValue = (value: unknown, path: (string | null)[]): unknown => {
    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item: unknown) => processValue(item, [...path, null]));
    }

    // Handle objects
    if (typeof value === "object" && value !== null) {
      const result: ParsedCredential = {};
      const obj = value as Record<string, unknown>;

      for (const [key, val] of Object.entries(obj)) {
        const currentPath = [...path, key];
        const displayDefinition = getDisplayMetadata(currentPath);

        if (!displayDefinition && !includeUndefinedAttributes) {
          continue;
        }

        let localizedNames: ParsedCredential[string]["name"] = key;
        if (displayDefinition) {
          const nameMap: Record<string, string> = {};
          for (const entry of displayDefinition) {
            nameMap[entry.locale] = entry.name;
          }
          localizedNames = nameMap;
        }

        result[key] = {
          name: localizedNames,
          value: processValue(val, currentPath),
        };
      }
      return result;
    }

    // Handle primitive values
    return value;
  };

  return processValue(parsedCredentialRaw, []) as ParsedCredential;
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

const verifyAndParseCredentialSdJwt: VerifyAndParseCredential = async (
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
    issuerConf.openid_credential_issuer.jwks.keys,
    credentialCryptoContext
  );

  Logger.log(LogLevel.DEBUG, `Decoded credential: ${JSON.stringify(decoded)}`);

  const credentialConfig =
    issuerConf.openid_credential_issuer.credential_configurations_supported[
      credentialConfigurationId
    ];

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

const verifyAndParseCredentialMDoc: VerifyAndParseCredential = async (
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
    issuerConf.openid_credential_issuer.credential_configurations_supported[
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

/**
 * Verify and parse an encoded credential.
 * @param issuerConf The Issuer configuration returned by {@link evaluateIssuerTrust}
 * @param credential The encoded credential returned by {@link obtainCredential}
 * @param credentialConfigurationId The credential configuration ID that defines the provided credential
 * @param context.credentialCryptoContext The crypto context used to obtain the credential in {@link obtainCredential}
 * @param context.ignoreMissingAttributes Skip error when attributes declared in the issuer configuration are not found within disclosures
 * @param context.includeUndefinedAttributes Include attributes not explicitly declared in the issuer configuration
 * @returns A parsed credential with attributes in plain value, the expiration and issuance date of the credential
 * @throws {IoWalletError} If the credential signature is not verified with the Issuer key set
 * @throws {IoWalletError} If the credential is not bound to the provided user key
 * @throws {IoWalletError} If the credential data fail to parse
 */
export const verifyAndParseCredential: VerifyAndParseCredential = async (
  issuerConf,
  credential,
  credentialConfigurationId,
  context,
  x509CertRoot
) => {
  const format =
    issuerConf.openid_credential_issuer.credential_configurations_supported[
      credentialConfigurationId
    ]?.format;

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
