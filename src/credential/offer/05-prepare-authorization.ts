import { Logger, LogLevel } from "../../utils/logging";
import { IoWalletError, IssuerResponseError } from "../../utils/errors";
import {
  generateRandomAlphaNumericString,
  hasStatusOrThrow,
} from "../../utils/misc";
import { type CredentialIssuerMetadata, type CredentialOffer } from "./types";
import type { GrantTypeSelection } from "./04-select-grant-type";
import { generatePkce, getAuthenticSourceMetadata } from "./utils";

type AuthRequestDetails = {
  clientId: string;
  redirectUri: string;
  offer: CredentialOffer;
  grantSelection: Extract<GrantTypeSelection, { type: "authorization_code" }>;
  issuerConf: CredentialIssuerMetadata;
};

export type AuthorizationResult = {
  authorizationUrl: string;
  codeVerifier: string;
  tokenEndpoint: string;
  jwksUri: string;
  state?: string;
};

export const prepareAuthorization = async (
  details: AuthRequestDetails,
  context: { appFetch?: GlobalFetch["fetch"] }
): Promise<AuthorizationResult> => {
  const { appFetch = fetch } = context;
  const { clientId, redirectUri, offer, grantSelection, issuerConf } = details;
  if (!grantSelection.authorization_server) {
    throw new IoWalletError(
      "Authorization server URL is missing in grant selection"
    );
  }

  // If details.offer.credential_configuration_ids is not present, discover the id from metadata and show the user what is available
  const allIdsAreSupported = offer.credential_configuration_ids.every(
    (idFromOffer) => {
      // Check if that ID exists as a key in the metadata's supported object
      return idFromOffer in issuerConf.credential_configurations_supported;
    }
  );

  if (!allIdsAreSupported) {
    throw new IoWalletError("Found unsupported credential configuration IDs");
  }

  let authorizationServerUrl = details.issuerConf.authorization_servers?.[0];
  if (!authorizationServerUrl) {
    authorizationServerUrl = details.issuerConf.credential_issuer;
  }

  const asMetadata = await getAuthenticSourceMetadata(
    authorizationServerUrl,
    appFetch
  );

  // Generate PKCE parameters
  const { codeVerifier, codeChallenge } = await generatePkce();
  const state = generateRandomAlphaNumericString(32);
  // Send issuer_state if provided in the grant selection
  const issuerState = grantSelection.issuer_state;

  const configurationId = offer.credential_configuration_ids[0];

  if (!configurationId) {
    throw new IoWalletError(
      "No credential configuration ID found in the offer"
    );
  }

  const scope =
    details.issuerConf.credential_configurations_supported[configurationId]
      ?.scope;

  if (!scope) {
    throw new IoWalletError(
      `Scope not defined for credential configuration ID: ${configurationId}`
    );
  }

  // Build authorization request parameters
  const requestBody = {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    state: state,
    code_challenge_method: "S256",
    scope,
    resource: issuerConf.credential_issuer,
    ...(issuerState ? { issuer_state: issuerState } : {}),
  };

  console.log(requestBody);

  const authorizationRequestFormBody = new URLSearchParams(requestBody);

  if (!issuerConf.credential_configurations_supported) {
    throw new Error("Issuer metadata does not contain 'credentials_supported'");
  }

  if (asMetadata.pushed_authorization_request_endpoint) {
    Logger.log(LogLevel.INFO, "Using Pushed Authorization Request (PAR)");
    const parResponse = await appFetch(
      asMetadata.pushed_authorization_request_endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: authorizationRequestFormBody.toString(),
      }
    )
      // https://www.rfc-editor.org/rfc/rfc9126.html#section-2.2
      // 201 is the only accepted success status code for PAR but some implementations may still use 200
      .then(hasStatusOrThrow([200, 201], IssuerResponseError))
      .then((res) => res.json());

    if (!parResponse.request_uri || !parResponse.expires_in) {
      throw new IoWalletError("Invalid PAR response from server");
    }

    const authorizationUrl = new URL(asMetadata.authorization_endpoint);
    authorizationUrl.searchParams.append("client_id", clientId);
    authorizationUrl.searchParams.append(
      "request_uri",
      parResponse.request_uri
    );
    authorizationUrl.searchParams.append("state", state);

    return {
      authorizationUrl: authorizationUrl.toString(),
      codeVerifier: codeVerifier,
      tokenEndpoint: asMetadata.token_endpoint,
      jwksUri: asMetadata.jwks_uri,
      state: state,
    };
  }

  Logger.log(
    LogLevel.WARN,
    "PAR endpoint not found. Using standard auth request."
  );
  const authorizationUrl = new URL(asMetadata.authorization_endpoint);
  authorizationUrl.search = authorizationRequestFormBody.toString();

  return {
    authorizationUrl: authorizationUrl.toString(),
    codeVerifier: codeVerifier,
    tokenEndpoint: asMetadata.token_endpoint,
    jwksUri: asMetadata.jwks_uri,
  };
};
