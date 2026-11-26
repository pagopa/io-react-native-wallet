/**
 * Common types definition for ISO 18013-5 and ISO 18013-7 modules.
 */

/**
 * Documents type to be used in the {@link generateResponse} for ISO18013-5 and {@link generateOID4VPDeviceResponse} for ISO18013-7.
 * It contains:
 * - issuerSignedContent which is a base64 or base64url encoded string representing the credential;
 * - alias which is the alias of the key used to sign the credential;
 * - docType which is the document type.
 */
export type RequestedDocument = {
  issuerSignedContent: string;
  alias: string;
  docType: string;
};

/**
 * This is the type definition for the accepted fields that will be presented to the verifier app.
 * It contains of a nested object structure, where the outermost key represents the credential doctype.
 * The inner dictionary contains namespaces, and for each namespace, there is another dictionary mapping requested claims to a boolean value,
 * which indicates whether the user is willing to present the corresponding claim. Example:
 * `{
 *    "org.iso.18013.5.1.mDL": {
 *      "org.iso.18013.5.1": {
 *        "hair_colour": true, // Indicates the user is willing to present this claim
 *        "given_name_national_character": true,
 *        "family_name_national_character": true,
 *        "given_name": true,
 *     },
 *     {...}
 *    },
 *    {...}
 *  }`
 **/
export type AcceptedFields = {
  [credential: string]: {
    [namespace: string]: { [field: string]: boolean };
  };
};
