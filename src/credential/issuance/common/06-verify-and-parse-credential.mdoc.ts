import type { PublicKey } from "@pagopa/io-react-native-crypto";
import type { CBOR } from "@pagopa/io-react-native-iso18013";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";

import type { Out } from "../../../utils/misc";
import type { IssuanceApi, IssuerConfig, ParsedCredential } from "../api";

import {
  getParsedCredentialClaimKey,
  verify as verifyMdoc,
} from "../../../mdoc";
import { IoWalletError } from "../../../utils/errors";
import { isSameThumbprint } from "../../../utils/jwk";

type ClaimConfig = CredentialConf["claims"][number];

type CredentialConf =
  IssuerConfig["credential_configurations_supported"][string];

type DecodedMDocCredential = Out<typeof verifyMdoc> & {
  issuerSigned: CBOR.IssuerSigned;
};

type DisplayableClaim = Omit<ClaimConfig, "display"> & {
  display: NonNullable<ClaimConfig["display"]>;
};

/**
 * Given a credential, verify it's in the supported format
 * and the credential is correctly signed
 * and it's bound to the given key
 *
 * @param rawCredential The received credential
 * @param x509CertRoot The root certificate of the issuer, which will be used to verify the signature
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
  holderBindingContext: CryptoContext,
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
      `Failed to verify holder binding, holder binding key and mDoc deviceKey don't match`,
    );
  }

  return decodedCredential;
}

const parseCredentialMDoc = (
  // the list of supported credentials, as defined in the issuer configuration
  credentialConfig: CredentialConf,
  // credential_type: string,
  { issuerSigned }: DecodedMDocCredential,
  ignoreMissingAttributes = false,
  includeUndefinedAttributes = false,
): ParsedCredential => {
  if (!credentialConfig) {
    throw new IoWalletError("Credential type not supported by the issuer");
  }

  if (!credentialConfig.claims) {
    throw new IoWalletError("Missing claims in the credential subject");
  }

  // Claims without display property (such as `iat`, `exp`, `iss`, etc.)
  // must be ignored as they are not meant to be displayed to the user.
  const displayableClaims = credentialConfig.claims.filter(
    (c) => c.display !== undefined,
  ) as DisplayableClaim[];

  const attrDefinitions = displayableClaims.map<
    [string, string, { locale: string; name: string }[]]
  >(({ display, path: [namespace, attribute] }) => [
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
      ]),
  );

  // Check that all mandatory attributes defined in the issuer configuration are present in the disclosure set
  // and filter the non present ones
  const attrsNotInDisclosures = attrDefinitions.filter(
    ([attrDefNamespace, attrKey]) =>
      !flatNamespaces.some(
        ([namespace, claim]) =>
          attrDefNamespace === namespace && attrKey === claim,
      ),
  );

  if (attrsNotInDisclosures.length > 0) {
    const missing = attrsNotInDisclosures
      .map(([, attrKey]) => attrKey)
      .join(", ");
    const received = flatNamespaces.map(([, attrKey]) => attrKey).join(", ");

    if (!ignoreMissingAttributes) {
      throw new IoWalletError(
        `Some attributes are missing in the credential. Missing: [${missing}], received: [${received}]`,
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
                attrDefNamespace === namespace && name === attrKey,
            )?.[2],
          },
        ] as const,
    )
    //filter the not found elements
    .filter(([_, __, definition]) => definition.value !== undefined)
    // Add a human-readable attribute name, with i18n, in the form { locale: name }
    // Example: { "it-IT": "Nome", "en-EN": "Name", "es-ES": "Nombre" }
    .reduce<ParsedCredential>(
      (acc, [attrDefNamespace, attrKey, { display, value }]) => ({
        ...acc,
        [getParsedCredentialClaimKey(attrDefNamespace, attrKey)]: {
          name: display.reduce(
            (names, { locale, name }) => ({
              ...names,
              [locale]: name,
            }),
            {},
          ),
          value,
        },
      }),
      {},
    );

  if (includeUndefinedAttributes) {
    const undefinedValues: ParsedCredential = Object.fromEntries(
      Object.values(flatNamespaces)
        .filter(
          ([namespace, key]) =>
            !definedValues[getParsedCredentialClaimKey(namespace, key)],
        )
        .map(([namespace, key, value]) => [
          getParsedCredentialClaimKey(namespace, key),
          { name: key, value },
        ]),
    );
    return {
      ...definedValues,
      ...undefinedValues,
    };
  }

  return definedValues;
};

export const verifyAndParseCredentialMDoc: IssuanceApi["verifyAndParseCredential"] =
  async (
    issuerConf,
    credential,
    credentialConfigurationId,
    {
      credentialCryptoContext,
      ignoreMissingAttributes,
      includeUndefinedAttributes,
    },
    x509CertRoot,
  ) => {
    if (!x509CertRoot) {
      throw new IoWalletError("Missing x509CertRoot");
    }

    const decoded = await verifyCredentialMDoc(
      credential,
      x509CertRoot,
      credentialCryptoContext,
    );

    const credentialConfig =
      issuerConf.credential_configurations_supported[
        credentialConfigurationId
      ]!;
    const parsedCredential = parseCredentialMDoc(
      credentialConfig,
      decoded,
      ignoreMissingAttributes,
      includeUndefinedAttributes,
    );

    const { signed, validUntil } =
      decoded.issuerSigned.issuerAuth.payload.validityInfo;

    return {
      credential,
      credentialConfigurationId,
      expiration: validUntil,
      issuedAt: signed,
      parsedCredential,
    };
  };
