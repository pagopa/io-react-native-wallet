import { InputDescriptor } from "./types";
import { SdJwt4VC, type DisclosureWithEncoded } from "../../sd-jwt/types";
import { JSONPath } from "jsonpath-plus";
import { IoWalletError } from "../../utils/errors";
import Ajv from "ajv";
const ajv = new Ajv();

export type EvaluateInputDescriptorSdJwt4VC = (
  inputDescriptor: InputDescriptor,
  payloadCredential: SdJwt4VC["payload"],
  disclosures: DisclosureWithEncoded[]
) => DisclosureWithEncoded[];

/**
 * Evaluates an InputDescriptor for an SD-JWT-based verifiable credential.
 *
 * - Checks each field in the InputDescriptor against the provided `payloadCredential`
 *   and `disclosures` (selectively disclosed claims).
 * - Validates whether required fields are present (unless marked optional)
 *   and match any specified JSONPath.
 * - If a field includes a JSON Schema filter, validates the claim value against that schema.
 * - Enforces `limit_disclosure` rules by returning only disclosures matching the specified fields
 *   if set to "required". Otherwise return the array of all disclosures.
 * - Throws an error if a required field is invalid or missing.
 *
 * @param inputDescriptor - Describes constraints (fields, filters, etc.) that must be satisfied.
 * @param payloadCredential - The credential payload to check against.
 * @param disclosures - An array of DisclosureWithEncoded objects representing selective disclosures.
 * @returns A filtered list of disclosures satisfying the descriptor constraints, or throws an error if not.
 * @throws Will throw an error if any required constraint fails or if JSONPath lookups are invalid.
 */
export const evaluateInputDescriptionForSdJwt4VC: EvaluateInputDescriptorSdJwt4VC =
  (inputDescriptor, payloadCredential, disclosures) => {
    if (!inputDescriptor?.constraints?.fields) {
      return disclosures; // No validation
    }

    // For each field, we need at least one matching path
    // If we succeed, we push the matched disclosure in matchedDisclosures and stop checking further paths
    const allFieldsValid = inputDescriptor.constraints.fields.every((field) => {
      // For Potential profile, selectively disclosed claims will always be built as an individual object property, by using a name-value pair.
      // Hence that selective claim for array element and recursive disclosures are not supported by Potential for the first iteration of Piloting.
      // We need to check inside payload or inside disclosures. Example path: "$.given_name"
      // We user slice to remove "$.", for future field.path can point deeper (e.g., $.some.deep.key), we may need more robust!!
      let matchedPath = field.path.find((singlePath) =>
        disclosures.find((item) => item.decoded[1] === singlePath.slice(2))
      );
      let matchedValue = matchedPath
        ? disclosures.find((item) => item.decoded[1] === matchedPath?.slice(2))
            ?.decoded[2]
        : undefined;

      if (!matchedPath) {
        matchedPath = field.path.find((singlePath) => {
          try {
            return (
              JSONPath({
                path: singlePath,
                json: payloadCredential,
              }).length > 0
            );
          } catch (error) {
            throw new IoWalletError(
              `JSONPath for "${singlePath}" does not match the provided payload.`
            );
          }
        });

        if (!matchedPath) {
          // Path should be optional, no need to validate! continue to next field
          return field?.optional;
        }

        matchedValue = JSONPath({
          path: matchedPath,
          json: payloadCredential,
        })[0];
      }

      // FILTER validation
      // If this field has a "filter" (JSON Schema), validate the claimValue
      if (field.filter) {
        const validateSchema = ajv.compile(field.filter);
        if (!validateSchema(matchedValue)) {
          throw new IoWalletError(
            `Claim value "${matchedValue}" for path "${matchedPath}" does not match the provided JSON Schema.`
          );
        }
      }

      // Submission Requirements validation
      // TODO: [EUDIW-216] Read rule value if “all” o “pick” and validate

      return true;
    });

    if (!allFieldsValid) {
      throw new IoWalletError(
        "Credential must not match the input descriptor!!"
      );
    }

    // If limit_disclosure set to "required", ensure that data is limited to the entries specified in the fields
    if (inputDescriptor.constraints.limit_disclosure === "required") {
      const allPaths = inputDescriptor.constraints.fields.flatMap((field) =>
        field.path.flatMap((path) => path.slice(2))
      );

      return disclosures.filter((item) => allPaths.includes(item.decoded[1]));
    }

    // Otherwise return the array of all disclosures
    return disclosures;
  };
