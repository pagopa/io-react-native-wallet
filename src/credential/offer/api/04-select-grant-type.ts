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

export interface SelectGrantTypeApi {
  /**
   * Selects the appropriate grant type from a given credential offer.
   * @param offer - The credential offer containing the grants.
   * @returns The selected grant type object.
   * @throws If no supported grant type is found in the credential offer.
   */
  selectGrantType(offer: CredentialOffer): GrantTypeSelection;
}
