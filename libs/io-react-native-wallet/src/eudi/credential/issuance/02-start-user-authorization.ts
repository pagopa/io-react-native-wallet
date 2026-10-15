import { createPkce } from "@pagopa/io-wallet-oauth2";
import { v4 as uuidv4 } from "uuid";

import { partialCallbacks } from "../../../utils/callbacks";
import { IssuerResponseError, ValidationFailed } from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import {
  type AuthorizationServerMetadata,
  type CredentialIssuerMetadata,
  ParResponse,
} from "./types";
import {
  type ClientAuthentication,
  getClientAuthenticationHeaders,
  getClientId,
  parseOrThrow,
} from "./utils";

export interface StartUserAuthorizationParams {
  authorizationServerMetadata: AuthorizationServerMetadata;
  clientAuthentication: ClientAuthentication;
  credentialConfigurationId: string;
  fetch?: typeof fetch;
  issuerMetadata: CredentialIssuerMetadata;
  /** The `issuer_state` of the Credential Offer `authorization_code` grant */
  issuerState?: string;
  redirectUri: string;
}

/**
 * Starts the Authorization Code Flow (OpenID4VCI 1.0, Section 5).
 *
 * The authorization request carries PKCE (S256) and the `issuer_state` of the offer.
 * The credential is requested by its `scope` when the Credential Issuer defines one, as required
 * by HAIP (Section 4.2), otherwise by `authorization_details` (OpenID4VCI 1.0, Section 5.1).
 * It is pushed to the Authorization Server (RFC 9126) when PAR is supported, as required by HAIP,
 * authenticating the wallet as described by {@link ClientAuthentication}.
 *
 * @returns The URL to open in the browser to let the user authenticate, with the
 *   `codeVerifier` and `state` needed to complete the flow
 * @throws {ValidationFailed} If the credential is not supported or PAR is required but not available
 * @throws {IssuerResponseError} If the Pushed Authorization Request fails
 */
export const startUserAuthorization = async ({
  authorizationServerMetadata,
  clientAuthentication,
  credentialConfigurationId,
  fetch: fetchFn = fetch,
  issuerMetadata,
  issuerState,
  redirectUri,
}: StartUserAuthorizationParams) => {
  const credentialConfiguration =
    issuerMetadata.credential_configurations_supported[
      credentialConfigurationId
    ];
  if (!credentialConfiguration) {
    throw new ValidationFailed({
      claim: "credential_configuration_id",
      message: `The Credential Issuer does not support ${credentialConfigurationId}`,
    });
  }

  const clientId = getClientId(clientAuthentication);
  const { codeChallenge, codeChallengeMethod, codeVerifier } = await createPkce(
    {
      allowedCodeChallengeMethods: ["S256"],
      callbacks: partialCallbacks,
    },
  );
  const state = uuidv4();

  const params = new URLSearchParams({
    client_id: clientId,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  if (credentialConfiguration.scope) {
    params.set("scope", credentialConfiguration.scope);
  } else {
    params.set(
      "authorization_details",
      JSON.stringify([
        {
          credential_configuration_id: credentialConfigurationId,
          type: "openid_credential",
        },
      ]),
    );
  }
  if (issuerState) {
    params.set("issuer_state", issuerState);
  }

  const {
    authorization_endpoint,
    issuer,
    pushed_authorization_request_endpoint,
    require_pushed_authorization_requests,
  } = authorizationServerMetadata;

  if (!pushed_authorization_request_endpoint) {
    if (require_pushed_authorization_requests) {
      throw new ValidationFailed({
        claim: "pushed_authorization_request_endpoint",
        message:
          "The Authorization Server requires PAR but does not expose its endpoint",
      });
    }
    return {
      authUrl: `${authorization_endpoint}?${params}`,
      codeVerifier,
      state,
    };
  }

  // RFC 9126 mandates 201, some servers answer 200
  const parResponse = await fetchFn(pushed_authorization_request_endpoint, {
    body: params.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(await getClientAuthenticationHeaders(clientAuthentication, issuer)),
    },
    method: "POST",
  })
    .then((res) =>
      res.status === 200
        ? res
        : hasStatusOrThrow(201, IssuerResponseError)(res),
    )
    .then((res) => res.json());

  const { request_uri } = parseOrThrow(
    ParResponse,
    parResponse,
    "Pushed Authorization Response",
  );

  const authParams = new URLSearchParams({ client_id: clientId, request_uri });
  return {
    authUrl: `${authorization_endpoint}?${authParams}`,
    codeVerifier,
    state,
  };
};
