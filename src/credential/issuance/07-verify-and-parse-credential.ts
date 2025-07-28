import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { Out } from "../../utils/misc";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { IoWalletError } from "../../utils/errors";
import { SdJwt4VC, verify as verifySdJwt } from "../../sd-jwt";
import { getValueFromDisclosures } from "../../sd-jwt/converters";
import { isSameThumbprint, type JWK } from "../../utils/jwk";
import type { ObtainCredential } from "./06-obtain-credential";
import { verify as verifyMdoc } from "../../mdoc/";
import { MDOC_DEFAULT_NAMESPACE } from "../../mdoc/const";
import { LogLevel, Logger } from "../../utils/logging";
import { extractElementValueAsDate } from "../../mdoc/converter";
import type { CBOR } from "@pagopa/io-react-native-cbor";
import { b64utob64 } from "jsrsasign";
import { getParsedCredentialClaimKey } from "src/mdoc/utils";

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
  }
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

// handy alias
type DecodedSdJwtCredential = Out<typeof verifySdJwt> & {
  sdJwt: SdJwt4VC;
};

const parseCredentialSdJwt = (
  // The credential configuration to use to parse the provided credential
  credentialConfig: CredentialConf,
  { sdJwt, disclosures }: DecodedSdJwtCredential,
  ignoreMissingAttributes: boolean = false,
  includeUndefinedAttributes: boolean = false
): ParsedCredential => {
  if (credentialConfig.format !== sdJwt.header.typ) {
    const message = `Received credential is of an unknwown type. Expected one of [${credentialConfig.format}], received '${sdJwt.header.typ}'`;
    Logger.log(LogLevel.ERROR, message);
    throw new IoWalletError(message);
  }

  if (!credentialConfig.claims) {
    Logger.log(LogLevel.ERROR, "Missing claims in the credential subject");
    throw new IoWalletError("Missing claims in the credential subject"); // TODO [SIW-1268]: should not be optional
  }
  const attrDefinitions = credentialConfig.claims;

  // the key of the attribute defintion must match the disclosure's name
  const attrsNotInDisclosures = attrDefinitions.filter(
    (definition) => !disclosures.some(([, name]) => name === definition.path[0]) // Ignore nested paths for now, see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-15.html#name-claims-path-pointer
  );
  if (attrsNotInDisclosures.length > 0) {
    const missing = attrsNotInDisclosures.map((_) => _.path[0]).join(", ");
    const received = disclosures.map((_) => _[1 /* name */]).join(", ");
    if (!ignoreMissingAttributes) {
      const message = `Some attributes are missing in the credential. Missing: [${missing}], received: [${received}]`;
      Logger.log(LogLevel.ERROR, message);
      throw new IoWalletError(message);
    }
  }

  // attributes that are defined in the issuer configuration
  // and are present in the disclosure set
  const definedValues = Object.fromEntries(
    attrDefinitions
      // retrieve the value from the disclosure set
      .map(
        ({ path, ...definition }) =>
          [
            path[0],
            {
              ...definition,
              value: disclosures.find(
                (_) => _[1 /* name */] === path[0]
              )?.[2 /* value */],
            },
          ] as const
      )
      // add a human readable attribute name, with i18n, in the form { locale: name }
      // example: { "it-IT": "Nome", "en-EN": "Name", "es-ES": "Nombre" }
      .map(
        ([attrKey, { display, ...definition }]) =>
          [
            attrKey,
            {
              ...definition,
              name: display.reduce(
                (names, { locale, name }) => ({ ...names, [locale]: name }),
                {} as Record<string, string>
              ),
            },
          ] as const
      )
  );

  if (includeUndefinedAttributes) {
    // attributes that are in the disclosure set
    // but are not defined in the issuer configuration
    const undefinedValues = Object.fromEntries(
      disclosures
        .filter((_) => !Object.keys(definedValues).includes(_[1]))
        .map(([, key, value]) => [key, { value, name: key }])
    );
    return {
      ...definedValues,
      ...undefinedValues,
    };
  }

  return definedValues;
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
      flatNamespaces.some(
        ([namespace, claim]) =>
          attrDefNamespace === namespace && attrKey === claim
      )
  );
  if (attrsNotInDisclosures.length > 0) {
    const missing = attrsNotInDisclosures
      .map(([, attrKey]) => attrKey)
      .join(", ");
    const received = Object.keys(Object.values(flatNamespaces));

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
): Promise<DecodedSdJwtCredential> {
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

  return decodedCredential;
}
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
async function verifyCredentialMDoc(
  rawCredential: string,
  issuerKeys: JWK[],
  holderBindingContext: CryptoContext
): Promise<DecodedMDocCredential> {
  /**
   * For the moment, being that issues in the crypto key generation
   * have been found on Android, the check for the deviceKey inside
   * of the mDoc is skipped, so we are not interested in the holderBindingKey
   */
  const [decodedCredential] =
    // parallel for optimization
    await Promise.all([
      verifyMdoc(rawCredential, issuerKeys),
      holderBindingContext.getPublicKey(),
    ]);

  if (!decodedCredential) {
    throw new IoWalletError("No MDOC credentials found!");
  }

  /**
   * For the moment, being that issues in the crypto key generation
   * have been found on Android, the check for the deviceKey inside
   * of the mDoc is skipped.
   */
  //const key = decodedCredential.mDoc.issuerSigned.issuerAuth.payload.deviceKeyInfo.deviceKey;
  //
  //if (!compareKeysByThumbprint(key, holderBindingKey as PublicKey)) {
  //  throw new IoWalletError(
  //    `Failed to verify holder binding, holder binding key and mDoc deviceKey don't match`
  //  );
  //}

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

  const parsedCredential = parseCredentialSdJwt(
    credentialConfig,
    decoded,
    ignoreMissingAttributes,
    includeUndefinedAttributes
  );
  const maybeIssuedAt = getValueFromDisclosures(decoded.disclosures, "iat");

  Logger.log(
    LogLevel.DEBUG,
    `Parsed credential: ${JSON.stringify(parsedCredential)}\nIssued at: ${maybeIssuedAt}`
  );

  return {
    parsedCredential,
    expiration: new Date(decoded.sdJwt.payload.exp * 1000),
    issuedAt:
      typeof maybeIssuedAt === "number"
        ? new Date(maybeIssuedAt * 1000)
        : undefined,
  };
};

const verifyAndParseCredentialMDoc: VerifyAndParseCredential = async (
  issuerConf,
  credential,
  credentialConfigurationId,
  { credentialCryptoContext, ignoreMissingAttributes }
) => {
  const decoded = await verifyCredentialMDoc(
    credential,
    issuerConf.openid_credential_issuer.jwks.keys,
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
  context
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
      return await verifyAndParseCredentialMDoc(
        issuerConf,
        b64utob64(credential), // TODO: remove this conversion after migrating from `io-react-native-cbor` to `io-react-native-ios`
        credentialConfigurationId,
        context
      );
    }

    default: {
      const message = `Unsupported credential format: ${format}`;
      Logger.log(LogLevel.ERROR, message);
      throw new IoWalletError(message);
    }
  }
};
