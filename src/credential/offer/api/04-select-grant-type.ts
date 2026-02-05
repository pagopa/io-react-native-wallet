import type {
  AuthorizationCodeGrant,
  CredentialOffer,
  PreAuthorizedCodeGrant,
} from "./types";

/**
 * Represent the selected grant type for the credential offer flow.
 */
export type GrantTypeSelection =
  | AuthorizationCodeGrant
  | PreAuthorizedCodeGrant;

/**
 * Selects the appropriate grant type from a given credential offer.
 * @param offer - The credential offer containing the grants.
 * @returns The selected grant type object.
 * @throws If no supported grant type is found in the credential offer.
 */
export interface SelectGrantTypeApi {
  selectGrantType(offer: CredentialOffer): GrantTypeSelection;
}
