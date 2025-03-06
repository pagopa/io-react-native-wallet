import { PresentationDefinition, RequestObject } from "./types";
import { RelyingPartyEntityConfiguration } from "../../trust/types";

export type FetchPresentationDefinition = (
  requestObject: RequestObject,
  rpConf?: RelyingPartyEntityConfiguration["payload"]["metadata"]
) => Promise<{
  presentationDefinition: PresentationDefinition;
}>;

/**
 * Retrieves a PresentationDefinition based on the given parameters.
 *
 * The method attempts the following strategies in order:
 * 1. Checks if `presentation_definition` is directly available in the request object.
 * 2. Uses a pre-configured `presentation_definition` from the relying party configuration if the `scope` is present in the request object.
 *
 * If none of the above conditions are met, the function throws an error indicating the definition could not be found. Note that `presentation_definition_uri` is not supported in 0.9.x.
 *
 * @param {RequestObject} requestObject - The request object containing the presentation definition or references to it.
 * @param {RelyingPartyEntityConfiguration["payload"]["metadata"]} [rpConf] - Optional relying party configuration.
 * @returns {Promise<{ presentationDefinition: PresentationDefinition }>} - Resolves with the presentation definition.
 * @throws {Error} - Throws if the presentation definition cannot be found or fetched.
 */
export const fetchPresentDefinition: FetchPresentationDefinition = async (
  requestObject,
  rpConf
) => {
  // Check if `presentation_definition` is directly available in the request object
  if (requestObject.presentation_definition) {
    return {
      presentationDefinition: requestObject.presentation_definition,
    };
  }

  // Check if `scope` is present in the request object and a pre-configured presentation definition exists
  if (
    requestObject.scope &&
    rpConf?.openid_credential_verifier?.presentation_definition
  ) {
    return {
      presentationDefinition:
        rpConf.openid_credential_verifier.presentation_definition,
    };
  }

  throw new Error("Presentation definition not found");
};
