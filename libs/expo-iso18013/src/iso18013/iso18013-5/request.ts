import { z } from 'zod';

// Inner data: a record of booleans with the attributes and the intent to retain flag
const booleanFieldGroup = z.record(z.string(), z.boolean());

// Parses raw X.509 subject fields from the verifier certificate
// and maps them to readable internal names.
const certificateDataSchema = z
  .object({
    C: z.string().optional(),
    O: z.string().optional(),
    SERIALNUMBER: z.string().optional(),
    CN: z.string().optional(),
  })
  .transform((certificate) => ({
    country: certificate.C,
    organization: certificate.O,
    serialNumber: certificate.SERIALNUMBER,
    commonName: certificate.CN,
  }));

const credentialEntrySchema = z
  .object({
    isAuthenticated: z.boolean(),
    certificateData: certificateDataSchema.optional(),
  })
  .catchall(booleanFieldGroup);

const VerifierRequest = z.object({
  request: z.record(z.string(), credentialEntrySchema),
});

/**
 * VerifierRequest type returned by the `onDocumentRequestReceived` event in `Events`.
 * The outermost key represents the credential doctype, the inner key represents the namespace and the innermost key represents the requested fields with a boolean value
 * indicating whether the verifier app wants to retain the field or not. The isAuthenticated field is present for each requested credentials and indicates wether or not the verifier is authenticated.
 * Example:
 *  `{
 *    "org.iso.18013.5.1.mDL": {
 *      "org.iso.18013.5.1": {
 *        "hair_colour": true,
 *        "given_name_national_character": true,
 *        "family_name_national_character": true,
 *        "given_name": true,
 *      },
 *      "isAuthenticated": true,
 *      "certificateData": {
 *        "country": "UT",
 *        "organization": "EUDI Wallet Reference Implementation",
 *        "serialNumber": "001",
 *        "commonName": "EUDI Proximity Verifier"
 *      }
 *    }
 *  }`
 * The request type can be also be used as input for the `generateResponse` method. The structure is the same, however the boolean value for each claim
 * indicates the willing to present the claim.
 */
export type VerifierRequest = z.infer<typeof VerifierRequest>;

/**
 * Parses the input to a VerifierRequest object.
 * This function is used to parse the request received from the verifier app.
 * @param input - The input to be parsed
 * @returns The parsed VerifierRequest object
 */
export const parseVerifierRequest = (input: unknown): VerifierRequest => {
  return VerifierRequest.parse(input);
};
