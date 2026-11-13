import { CBOR } from "@pagopa/io-react-native-iso18013";

import type { IssuanceApi } from "../credential/issuance";
import type { Out } from "../utils/misc";

import { Verification } from "../sd-jwt/types";
import { MDOC_VERIFICATION_IDENTIFIER } from "./const";

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
 * @returns The verification claim or undefined if it wasn't found
 */
export const getVerificationFromParsedCredential = (
  parsedCredential: Out<
    IssuanceApi["verifyAndParseCredential"]
  >["parsedCredential"],
) => {
  const verificationKey = Object.keys(parsedCredential).find((key) =>
    key.endsWith(MDOC_VERIFICATION_IDENTIFIER),
  );
  const verification = verificationKey
    ? parsedCredential[verificationKey]?.value
    : undefined;
  return verification ? Verification.parse(verification) : undefined;
};

/**
 * Extract and validate the `verification` claim from an MDOC credential.
 *
 * This method is **asynchronous**. See {@link getVerificationFromParsedCredential} for the synchronous version.
 *
 * @param token The raw MDOC credential
 * @returns The verification claim or undefined if it wasn't found
 */
export const getVerification = async (token: string) => {
  const issuerSigned = await CBOR.decodeIssuerSigned(token);

  const flattenedClaims = Object.values(issuerSigned.nameSpaces).flat();

  const verification = flattenedClaims?.find(
    (x) => x.elementIdentifier === MDOC_VERIFICATION_IDENTIFIER,
  )?.elementValue;

  return verification ? Verification.parse(verification) : undefined;
};
