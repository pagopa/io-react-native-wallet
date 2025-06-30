import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { ResponseMode } from "./types";
import { generateRandomAlphaNumericString, type Out } from "../../utils/misc";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import type { StartFlow } from "./01-start-flow";
import { AuthorizationDetail, makeParRequest } from "../../utils/par";
import { LogLevel, Logger } from "../../utils/logging";

export type StartUserAuthorization = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialConfigIds: string[],
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
  credentialDefinition: AuthorizationDetail[];
}>;

/**
 * Ensures that the credential type requested is supported by the issuer and contained in the
 * issuer configuration.
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param credentialConfigId The credential configuration ID to be requested;
 * @returns The credential definition to be used in the request which includes the format and the type and its type
 */
const selectCredentialDefinition = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialConfigId: Out<StartFlow>["credentialConfigId"]
): AuthorizationDetail => {
  const credential_configurations_supported =
    issuerConf.openid_credential_issuer.credential_configurations_supported;

  const [result] = Object.keys(credential_configurations_supported)
    .filter((e) => e.includes(credentialConfigId))
    .map(() => ({
      credential_configuration_id: credentialConfigId,
      type: "openid_credential" as const,
    }));

  if (!result) {
    Logger.log(
      LogLevel.ERROR,
      `Requested credential ${credentialConfigId} is not supported by the issuer according to its configuration ${JSON.stringify(credential_configurations_supported)}`
    );
    throw new Error(`No credential support the type '${credentialConfigId}'`);
  }
  return result;
};

/**
 * Ensures that the response mode requested is supported by the issuer and contained in the issuer configuration.
 * When multiple credentials are provided, all of them must support the same response_mode.
 * @param issuerConf The issuer configuration
 * @param credentialConfigId The credential configuration IDs to be requested
 * @returns The response mode to be used in the request, "query" for PersonIdentificationData and "form_post.jwt" for all other types.
 */
const selectResponseMode = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialConfigIds: string[]
): ResponseMode => {
  const responseModeSupported =
    issuerConf.oauth_authorization_server.response_modes_supported;

  const responseModeSet = new Set<ResponseMode>();

  for (const credentialConfigId of credentialConfigIds) {
    responseModeSet.add(
      credentialConfigId.match(/PersonIdentificationData/i)
        ? "query"
        : "form_post.jwt"
    );
  }

  if (responseModeSet.size !== 1) {
    Logger.log(
      LogLevel.ERROR,
      `${credentialConfigIds} have incompatible response_mode: ${[...responseModeSet.values()]}`
    );
    throw new Error(
      "Requested credentials have incompatible response_mode and cannot be requested with the same PAR request"
    );
  }

  const [responseMode] = responseModeSet.values();

  Logger.log(
    LogLevel.DEBUG,
    `Selected response mode ${responseMode} for credential IDs ${credentialConfigIds}`
  );

  if (!responseModeSupported.includes(responseMode!)) {
    Logger.log(
      LogLevel.ERROR,
      `Requested response mode ${responseMode} is not supported by the issuer according to its configuration ${JSON.stringify(responseModeSupported)}`
    );
    throw new Error(
      `No response mode support for IDs '${credentialConfigIds}'`
    );
  }

  return responseMode!;
};

/**
 * WARNING: This function must be called after {@link evaluateIssuerTrust} and {@link startFlow}. The next steam is {@link compeUserAuthorizationWithQueryMode} or {@link compeUserAuthorizationWithFormPostJwtMode}
 *
 * Creates and sends a PAR request to the /as/par endpoint of the authorization server.
 * This starts the authentication flow to obtain an access token.
 * This token enables the Wallet Instance to request a digital credential from the Credential Endpoint of the Credential Issuer; when multiple credential types are passed,
 * it is possible to use the same access token for the issuance of all requested credentials.
 * This is an HTTP POST request containing the Wallet Instance identifier (client id), the code challenge and challenge method as specified by PKCE according to RFC 9126
 * along with the WTE and its proof of possession (WTE-PoP).
 * Additionally, it includes a request object, which is a signed JWT encapsulating the type of digital credential requested (authorization_details),
 * the application session identifier on the Wallet Instance side (state),
 * the method (query or form_post.jwt) by which the Authorization Server
 * should transmit the Authorization Response containing the authorization code issued upon the end user's authentication (response_mode)
 * to the Wallet Instance's Token Endpoint to obtain the Access Token, and the redirectUri of the Wallet Instance where the Authorization Response
 * should be delivered. The redirect is achived by using a custom URL scheme that the Wallet Instance is registered to handle.
 * @param issuerConf The issuer configuration
 * @param credentialConfigIds The credential configuration IDs to be requested
 * @param ctx The context object containing the Wallet Instance's cryptographic context, the Wallet Instance's attestation, the redirect URI and the fetch implementation
 * @returns The URI to which the end user should be redirected to start the authentication flow, along with the client id, the code verifier and the credential definition(s)
 */

export const startUserAuthorization: StartUserAuthorization = async (
  issuerConf,
  credentialConfigIds,
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
    Logger.log(
      LogLevel.ERROR,
      `Public key associated with kid ${clientId} not found in the device`
    );
    throw new Error("No public key found");
  }
  const codeVerifier = generateRandomAlphaNumericString(64);
  const parEndpoint =
    issuerConf.oauth_authorization_server.pushed_authorization_request_endpoint;
  const aud = issuerConf.openid_credential_issuer.credential_issuer;
  const credentialDefinition = credentialConfigIds.map((c) =>
    selectCredentialDefinition(issuerConf, c)
  );
  const responseMode = selectResponseMode(issuerConf, credentialConfigIds);
  const getPar = makeParRequest({ wiaCryptoContext, appFetch });
  const issuerRequestUri = await getPar(
    parEndpoint,
    walletInstanceAttestation,
    {
      aud,
      clientId,
      codeVerifier,
      redirectUri,
      responseMode,
      authorizationDetails: credentialDefinition,
    }
  );

  return { issuerRequestUri, clientId, codeVerifier, credentialDefinition };
};
