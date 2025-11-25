import { CBOR } from "@pagopa/io-react-native-iso18013";
import { Verification } from "../sd-jwt/types";
import type { VerifyAndParseCredential } from "../credential/issuance";
import type { Out } from "../utils/misc";

/**
 * Namespaces mapping for mdoc credentials.
 * Add new mappings here as new mdoc credentials are supported.
 */
const CREDENTIAL_NAMESPACE_MAP: Record<string, string> = {
  mso_mdoc_mDL: "org.iso.18013.5.1",
  mso_mdoc_PersonIdentificationData: "eu.europa.ec.eudi.pid.1",
  "eu.europa.ec.eudi.pid_mdoc": "eu.europa.ec.eudi.pid.1",
  "eu.europa.ec.eudi.mdl_mdoc": "org.iso.18013.5.1",
};

/**
 * Returns the mdoc namespace for a given credential ID.
 *
 * @param credentialId - The credential ID
 * @returns The corresponding mdoc namespace, or undefined if not found
 */
export function getMdocNamespaceForCredentialId(
  credentialId: string
): string | undefined {
  return CREDENTIAL_NAMESPACE_MAP[credentialId];
}

/**
 * @param namespace The mdoc credential `namespace`
 * @param key The claim attribute key
 * @returns A string consisting of the concatenation of the namespace and the claim key, separated by a colon
 */
export const getParsedCredentialClaimKey = (namespace: string, key: string) =>
  `${namespace}:${key}`;

/**
 * Extract and validate the `verification` claim from an mdoc parsed credential.
 *
 * This method is **synchronous**, so it requires a credential that was already parsed.
 *
 * @param parsedCredential The parsed mdoc credential
 * @param credentialConfigurationId The credential configuration ID
 * @returns The verification claim or undefined if it wasn't found
 */
export const getVerificationFromParsedCredential = (
  parsedCredential: Out<VerifyAndParseCredential>["parsedCredential"],
  credentialConfigurationId: string
) => {
  const ns = getMdocNamespaceForCredentialId(credentialConfigurationId);
  const verificationKey = getParsedCredentialClaimKey(
    `${ns}.IT`,
    "verification"
  );
  const verification = parsedCredential[verificationKey]?.value;
  return verification ? Verification.parse(verification) : undefined;
};

/**
 * Extract and validate the `verification` claim from an MDOC credential.
 *
 * This method is **asynchronous**. See {@link getVerificationFromParsedCredential} for the synchronous version.
 *
 * @param token The raw MDOC credential
 * @param credentialConfigurationId The credential configuration ID
 * @returns The verification claim or undefined if it wasn't found
 */
export const getVerification = async (
  token: string,
  credentialConfigurationId: string
) => {
  const issuerSigned = await CBOR.decodeIssuerSigned(token);
  const ns = getMdocNamespaceForCredentialId(credentialConfigurationId);
  const namespace = issuerSigned.nameSpaces[`${ns}.IT`];
  const verification = namespace?.find(
    (x) => x.elementIdentifier === "verification"
  )?.elementValue;

  return verification ? Verification.parse(verification) : undefined;
};
