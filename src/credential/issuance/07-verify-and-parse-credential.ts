import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { CBOR } from "@pagopa/io-react-native-cbor";
import type { Out } from "../../utils/misc";
import type { GetIssuerConfig } from "./02-get-issuer-config";
import { IoWalletError } from "../../utils/errors";
import { SdJwt4VC } from "../../sd-jwt/types";
import { verify as verifySdJwt } from "../../sd-jwt";
import { verify as verifyMdoc } from "../../mdoc";
import { getValueFromDisclosures } from "../../sd-jwt/converters";
import type { JWK } from "../../utils/jwk";
import type { ObtainCredential } from "./06-obtain-credential";
import {
  CredentialSdJwtClaims,
  CredentialClaim,
} from "../../entity/openid-connect/issuer/types";
import { extractElementValueAsDate } from "../../mdoc/converters";

export type VerifyAndParseCredential = (
  issuerConf: Out<GetIssuerConfig>["issuerConf"],
  credential: Out<ObtainCredential>["credential"],
  format: Out<ObtainCredential>["format"],
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
type ParsedCredential = Record<
  /** Attribute key */
  string,
  {
    /** Human-readable name of the attribute */
    name:
      | /* if i18n is provided */ Record<
          string /* locale */,
          string /* value */
        >
      | /* if no i18n is provided */ string
      | undefined; // Add undefined as a possible value for the name property
    /** The actual value of the attribute */
    value: unknown;
  }
>;

// handy alias
type DecodedSdJwtCredential = Out<typeof verifySdJwt> & {
  sdJwt: SdJwt4VC;
};

type DecodedMDocCredential = Out<typeof verifyMdoc> & {
  mDoc: CBOR.MDOC;
};

const parseCredentialSdJwt = (
  // the list of supported credentials, as defined in the issuer configuration
  credentials_supported: Out<GetIssuerConfig>["issuerConf"]["credential_configurations_supported"],
  { sdJwt, disclosures }: DecodedSdJwtCredential,
  ignoreMissingAttributes: boolean = false,
  includeUndefinedAttributes: boolean = false
): ParsedCredential => {
  const credentialSubject = credentials_supported[sdJwt.payload.vct];

  if (!credentialSubject) {
    throw new IoWalletError("Credential type not supported by the issuer");
  }

  if (credentialSubject.format !== sdJwt.header.typ) {
    throw new IoWalletError(
      `Received credential is of an unknwown type. Expected one of [${credentialSubject.format}], received '${sdJwt.header.typ}', `
    );
  }

  // transfrom a record { key: value } in an iterable of pairs [key, value]
  if (!credentialSubject.claims) {
    throw new IoWalletError("Missing claims in the credential subject"); // TODO [SIW-1268]: should not be optional
  }
  const claims = credentialSubject.claims as CredentialSdJwtClaims;
  const attrDefinitions = Object.entries(claims);

  // the key of the attribute defintion must match the disclosure's name
  const attrsNotInDisclosures = attrDefinitions.filter(
    ([attrKey]) => !disclosures.some(([, name]) => name === attrKey)
  );
  if (attrsNotInDisclosures.length > 0) {
    const missing = attrsNotInDisclosures.map((_) => _[0 /* key */]).join(", ");
    const received = disclosures.map((_) => _[1 /* name */]).join(", ");
    if (!ignoreMissingAttributes) {
      throw new IoWalletError(
        `Some attributes are missing in the credential. Missing: [${missing}], received: [${received}]`
      );
    }
  }

  // attributes that are defined in the issuer configuration
  // and are present in the disclosure set
  const definedValues = Object.fromEntries(
    attrDefinitions
      // retrieve the value from the disclosure set
      .map(
        ([attrKey, definition]) =>
          [
            attrKey,
            {
              ...definition,
              value: disclosures.find(
                (_) => _[1 /* name */] === attrKey
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
  credentials_supported: Out<GetIssuerConfig>["issuerConf"]["credential_configurations_supported"],
  { mDoc }: DecodedMDocCredential,
  includeUndefinedAttributes: boolean = false
): ParsedCredential => {
  const credentialSubject = credentials_supported[mDoc.docType];

  if (!credentialSubject) {
    throw new IoWalletError("Credential type not supported by the issuer");
  }

  // transfrom a record { key: value } in an iterable of pairs [key, value]
  if (!credentialSubject.claims) {
    throw new IoWalletError("Missing claims in the credential subject"); // TODO [SIW-1268]: should not be optional
  }

  const claims = credentialSubject.claims as Record<
    string,
    CredentialSdJwtClaims
  >;

  const attrDefinitions: [string, string, CredentialClaim][] = Object.entries(
    claims
  ).flatMap(([namespace, claimName]) =>
    Object.entries(claimName).map(
      ([claimNameKey, definition]) =>
        [namespace, claimNameKey, definition] as [
          string,
          string,
          CredentialClaim
        ]
    )
  );

  if (!mDoc.issuerSigned.nameSpaces) {
    throw new IoWalletError("Missing claims in the credential");
  }

  const flatNamespaces: [string, string, string][] = Object.entries(
    mDoc.issuerSigned.nameSpaces
  ).flatMap(([namespace, values]) =>
    values.map(
      (v) =>
        [namespace, v.elementIdentifier, v.elementValue] as [
          string,
          string,
          string
        ]
    )
  );

  // Attributes defined in the issuer configuration and present in the disclosure set
  const definedValues = Object.fromEntries(
    attrDefinitions
      // Retrieve the value from the corresponding disclosure
      .map(
        ([attrDefNamespace, attrKey, definition]) =>
          [
            attrKey,
            {
              ...definition,
              value: flatNamespaces.find(
                ([namespace, name]) =>
                  attrDefNamespace === namespace && name === attrKey
              )?.[2],
            },
          ] as const
      )
      // Add a human-readable attribute name, with i18n, in the form { locale: name }
      // Example: { "it-IT": "Nome", "en-EN": "Name", "es-ES": "Nombre" }
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
    // Attributes that are present in the disclosure set but not defined in the issuer configuration
    const undefinedValues = Object.fromEntries(
      flatNamespaces
        .filter(([, key]) => !Object.keys(definedValues).includes(key))
        .map(([, key, value]) => [key, { value, name: key }])
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

  if (!cnf.jwk.kid || cnf.jwk.kid !== holderBindingKey.kid) {
    throw new IoWalletError(
      `Failed to verify holder binding, expected kid: ${holderBindingKey.kid}, got: ${decodedCredential.sdJwt.payload.cnf.jwk.kid}`
    );
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
  const [decodedCredential] =
    // parallel for optimization
    await Promise.all([
      verifyMdoc(rawCredential, issuerKeys),
      holderBindingContext.getPublicKey(),
    ]);

  // TODO Implement the holder binding verification for MDOC

  // Get only the first decoded credential

  if (!decodedCredential) {
    throw new IoWalletError("No MDOC credentials found!");
  }

  return {
    mDoc: decodedCredential.mDoc,
  };
}

// utility type that specialize VerifyAndParseCredential for given format
type WithFormat<Format extends Parameters<VerifyAndParseCredential>[2]> = (
  _0: Parameters<VerifyAndParseCredential>[0],
  _1: Parameters<VerifyAndParseCredential>[1],
  _2: Format,
  _3: Parameters<VerifyAndParseCredential>[3]
) => ReturnType<VerifyAndParseCredential>;

const verifyAndParseCredentialSdJwt: WithFormat<"vc+sd-jwt"> = async (
  issuerConf,
  credential,
  _,
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

  const parsedCredential = parseCredentialSdJwt(
    issuerConf.credential_configurations_supported,
    decoded,
    ignoreMissingAttributes,
    includeUndefinedAttributes
  );

  const maybeIssuedAt = getValueFromDisclosures(decoded.disclosures, "iat");

  return {
    parsedCredential,
    expiration: new Date(decoded.sdJwt.payload.exp * 1000),
    issuedAt:
      typeof maybeIssuedAt === "number"
        ? new Date(maybeIssuedAt * 1000)
        : undefined,
  };
};

const verifyAndParseCredentialMDoc: WithFormat<"mso_mdoc"> = async (
  issuerConf,
  credential,
  _,
  { credentialCryptoContext, ignoreMissingAttributes }
) => {
  const decoded = await verifyCredentialMDoc(
    credential,
    issuerConf.keys,
    credentialCryptoContext
  );

  const parsedCredential = parseCredentialMDoc(
    issuerConf.credential_configurations_supported,
    decoded,
    ignoreMissingAttributes
  );

  const expirationDate = extractElementValueAsDate(
    parsedCredential?.expiry_date?.value as string
  );
  if (!expirationDate) {
    throw new IoWalletError(`expirationDate must be present!!`);
  }
  expirationDate?.setDate(expirationDate.getDate() + 1);

  const maybeIssuedAt = extractElementValueAsDate(
    parsedCredential?.issue_date?.value as string
  );
  maybeIssuedAt?.setDate(maybeIssuedAt.getDate() + 1);

  return {
    parsedCredential,
    expiration: expirationDate ?? new Date(),
    issuedAt: maybeIssuedAt ?? undefined,
  };
};

/**
 * Verify and parse an encoded credential.
 * @param issuerConf The Issuer configuration returned by {@link getIssuerConfig}
 * @param credential The encoded credential returned by {@link obtainCredential}
 * @param format The format of the credentual returned by {@link obtainCredential}
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
  format,
  context
) => {
  if (format === "vc+sd-jwt") {
    return verifyAndParseCredentialSdJwt(
      issuerConf,
      credential,
      format,
      context
    );
  }
  if (format === "mso_mdoc") {
    return verifyAndParseCredentialMDoc(
      issuerConf,
      credential,
      format,
      context
    );
  }

  throw new IoWalletError(`Unsupported credential format: ${format}`);
};
