import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { ResponseMode } from "./types";
import { generateRandomAlphaNumericString, type Out } from "../../utils/misc";
import type { GetIssuerConfig } from "./02-get-issuer-config";
import type { StartFlow } from "./01-start-flow";
import { AuthorizationDetail, makeParRequest } from "../../utils/par";

export type StartUserAuthorization = (
  issuerConf: Out<GetIssuerConfig>["issuerConf"],
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
 * @param issuerConf The issuer configuration returned by {@link getIssuerConfig}
 * @param credentialType The type of the credential to be requested returned by {@link startFlow}
 * @param context.wiaCryptoContext The Wallet Instance's crypto context
 * @param context.walletInstanceAttestation The Wallet Instance's attestation
 * @param context.redirectUri The redirect URI which is the custom URL scheme that the Wallet Instance is registered to handle
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The credential definition to be used in the request which includes the format and the type and its type
 */
const selectCredentialDefinition = (
  issuerConf: Out<GetIssuerConfig>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"]
): AuthorizationDetail => {
  const credential_configurations_supported =
    issuerConf.credential_configurations_supported;

  const [result] = credential_configurations_supported
    .filter((e) => e.credential_definition.type.includes(credentialType))
    .map((e) => ({
      credential_configuration_id: credentialType,
      format: e.format,
      type: "openid_credential" as const,
    }));

  console.log(JSON.stringify(result));

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
  credentialType: Out<StartFlow>["credentialType"]
): ResponseMode => {
  const responseMode =
    credentialType === "PersonIdentificationData" ? "query" : "form_post.jwt";

  return responseMode;
};

/**
 * WARNING: This function must be called after {@link getIssuerConfig} and {@link startFlow}. The next steam is {@link compeUserAuthorizationWithQueryMode} or {@link compeUserAuthorizationWithFormPostJwtMode}
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
  console.log(JSON.stringify(issuerConf));

  const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
  const codeVerifier = generateRandomAlphaNumericString(64);
  const parEndpoint = issuerConf.pushed_authorization_request_endpoint;
  const credentialDefinition = selectCredentialDefinition(
    issuerConf,
    credentialType
  );
  const responseMode = selectResponseMode(credentialType);

  const getPar = makeParRequest({ wiaCryptoContext, appFetch });
  const issuerRequestUri = await getPar(
    clientId,
    codeVerifier,
    redirectUri,
    responseMode,
    parEndpoint,
    walletInstanceAttestation,
    [credentialDefinition]
  );

  return { issuerRequestUri, clientId, codeVerifier, credentialDefinition };
};
