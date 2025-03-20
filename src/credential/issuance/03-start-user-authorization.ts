import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { ResponseMode } from "./types";
import { generateRandomAlphaNumericString, type Out } from "../../utils/misc";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import type { StartFlow } from "./01-start-flow";
import { AuthorizationDetail, makeParRequest } from "../../utils/par";
import { ASSERTION_TYPE } from "./const";

export type StartUserAuthorization = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"],
  context: {
    wiaCryptoContext: CryptoContext;
    walletInstanceAttestation: string;
    redirectUri: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{
  issuerRequestUri: string;
  clientId: string;
  codeVerifier: string;
  credentialDefinition: AuthorizationDetail;
}>;

/**
 * Ensures that the credential type requested is supported by the issuer and contained in the
 * issuer configuration.
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param credentialType The type of the credential to be requested returned by {@link startFlow}
 * @param context.wiaCryptoContext The Wallet Instance's crypto context
 * @param context.walletInstanceAttestation The Wallet Instance's attestation
 * @param context.redirectUri The redirect URI which is the custom URL scheme that the Wallet Instance is registered to handle
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The credential definition to be used in the request which includes the format and the type and its type
 */
const selectCredentialDefinition = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"]
): AuthorizationDetail => {
  const credential_configurations_supported =
    issuerConf.openid_credential_issuer.credential_configurations_supported;

  const [result] = Object.keys(credential_configurations_supported)
    .filter((e) => e.includes(credentialType))
    .map((e) => ({
      credential_configuration_id: credentialType,
      format: credential_configurations_supported[e]!.format,
      type: "openid_credential" as const,
    }));

  if (!result) {
    throw new Error(`No credential support the type '${credentialType}'`);
  }
  return result;
};

/**
 * Ensures that the response mode requested is supported by the issuer and contained in the issuer configuration.
 * @param issuerConf The issuer configuration
 * @param credentialType The type of the credential to be requested
 * @returns The response mode to be used in the request, "query" for PersonIdentificationData and "form_post.jwt" for all other types.
 */
const selectResponseMode = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"]
): ResponseMode => {
  const responseModeSupported =
    issuerConf.oauth_authorization_server.response_modes_supported;

  const responseMode =
    credentialType === "PersonIdentificationData" ? "query" : "form_post.jwt";

  if (!responseModeSupported.includes(responseMode)) {
    throw new Error(`No response mode support the type '${credentialType}'`);
  }

  return responseMode;
};

/**
 * WARNING: This function must be called after {@link evaluateIssuerTrust} and {@link startFlow}. The next steam is {@link compeUserAuthorizationWithQueryMode} or {@link compeUserAuthorizationWithFormPostJwtMode}
 * Creates and sends a PAR request to the /as/par endpoint of the authorization server.
 * This starts the authentication flow to obtain an access token.
 * This token enables the Wallet Instance to request a digital credential from the Credential Endpoint of the Credential Issuer.
 * This is an HTTP POST request containing the Wallet Instance identifier (client id), the code challenge and challenge method as specified by PKCE according to RFC 9126
 * along with the WTE and its proof of possession (WTE-PoP).
 * Additionally, it includes a request object, which is a signed JWT encapsulating the type of digital credential requested (authorization_details),
 * the application session identifier on the Wallet Instance side (state),
 * the method (query or form_post.jwt) by which the Authorization Server
 * should transmit the Authorization Response containing the authorization code issued upon the end user's authentication (response_mode)
 * to the Wallet Instance's Token Endpoint to obtain the Access Token, and the redirectUri of the Wallet Instance where the Authorization Response
 * should be delivered. The redirect is achived by using a custom URL scheme that the Wallet Instance is registered to handle.
 * @param issuerConf The issuer configuration
 * @param credentialType The type of the credential to be requested returned by {@link selectCredentialDefinition}
 * @param ctx The context object containing the Wallet Instance's cryptographic context, the Wallet Instance's attestation, the redirect URI and the fetch implementation
 * @returns The URI to which the end user should be redirected to start the authentication flow, along with the client id, the code verifier and the credential definition
 */
export const startUserAuthorization: StartUserAuthorization = async (
  issuerConf,
  credentialType,
  ctx
) => {
  const {
    wiaCryptoContext,
    walletInstanceAttestation,
    redirectUri,
    appFetch = fetch,
  } = ctx;

  const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
  if (!clientId) {
    throw new Error("No public key found");
  }
  const codeVerifier = generateRandomAlphaNumericString(64);
  const parEndpoint =
    issuerConf.oauth_authorization_server.pushed_authorization_request_endpoint;
  const credentialDefinition = selectCredentialDefinition(
    issuerConf,
    credentialType
  );
  const responseMode = selectResponseMode(issuerConf, credentialType);

  const getPar = makeParRequest({ wiaCryptoContext, appFetch });
  const issuerRequestUri = await getPar(
    clientId,
    codeVerifier,
    redirectUri,
    responseMode,
    parEndpoint,
    walletInstanceAttestation,
    [credentialDefinition],
    ASSERTION_TYPE
  );

  return { issuerRequestUri, clientId, codeVerifier, credentialDefinition };
};
