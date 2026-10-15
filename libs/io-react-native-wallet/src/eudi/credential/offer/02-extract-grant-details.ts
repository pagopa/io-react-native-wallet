import {
  type CredentialOffer,
  type ExtractGrantDetailsResult,
  PRE_AUTHORIZED_CODE_GRANT_TYPE,
} from "./types";

/**
 * Extracts the grant details from a resolved EUDI Wallet Credential Offer.
 *
 * Both the `authorization_code` and the `pre-authorized_code` grants are supported.
 * When the offer carries no grants, both fields are `undefined` and the Wallet must
 * determine the supported grants from the Authorization Server metadata
 * (OpenID4VCI 1.0, Section 4.1.1).
 *
 * @param offer - A previously resolved Credential Offer
 * @returns The details of the grants found in the offer
 */
export const extractGrantDetails = (
  offer: CredentialOffer,
): ExtractGrantDetailsResult => {
  const authorizationCode = offer.grants?.authorization_code;
  const preAuthorizedCode = offer.grants?.[PRE_AUTHORIZED_CODE_GRANT_TYPE];

  return {
    authorizationCodeGrant: authorizationCode && {
      authorizationServer: authorizationCode.authorization_server,
      issuerState: authorizationCode.issuer_state,
    },
    preAuthorizedCodeGrant: preAuthorizedCode && {
      authorizationServer: preAuthorizedCode.authorization_server,
      preAuthorizedCode: preAuthorizedCode["pre-authorized_code"],
      txCode: preAuthorizedCode.tx_code && {
        description: preAuthorizedCode.tx_code.description,
        inputMode: preAuthorizedCode.tx_code.input_mode,
        length: preAuthorizedCode.tx_code.length,
      },
    },
  };
};
