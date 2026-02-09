import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { AuthorizationDetail } from "../../../utils/par";
import type { IssuerConfig } from "./IssuerConfig";

export interface StartUserAuthorizationApi {
  /**
   * WARNING: This function must be called after {@link evaluateIssuerTrust}. The next steam is {@link completeUserAuthorizationWithQueryMode} or {@link completeUserAuthorizationWithFormPostJwtMode}
   *
   * Creates and sends a PAR request to the PAR endpoint of the authorization server.
   * This starts the authentication flow to obtain an access token.
   * This token enables the Wallet Instance to request a digital credential from the Credential Endpoint of the Credential Issuer; when multiple credential types are passed,
   * it is possible to use the same access token for the issuance of all requested credentials.
   *
   * This is an HTTP POST request containing the Wallet Instance identifier (client id), the code challenge and challenge method as specified by PKCE according to RFC 9126
   * along with the WTE and its proof of possession (WTE-PoP).
   * Additionally, it includes a request object, which is a signed JWT encapsulating the type of digital credential requested (authorization_details), challenge method and
   * redirect URI for the document proof step (if L2 flow), the application session identifier on the Wallet Instance side (state), the method (query or form_post.jwt)
   * by which the Authorization Server should transmit the Authorization Response containing the authorization code issued upon the end user's authentication (response_mode)
   * to the Wallet Instance's Token Endpoint to obtain the Access Token, and the redirectUri of the Wallet Instance where the Authorization Response should be delivered.
   * The redirect is achived by using a custom URL scheme that the Wallet Instance is registered to handle.
   * @since 1.0.0
   *
   * @param issuerConf The issuer configuration
   * @param credentialIds The credential configuration IDs to be requested
   * @param proof The configuration for the proof to be used in the request: "none" for standard flows, "document" for L2+ with MRTD verification.
   * @param context.wiaCryptoContext The Wallet Instance's cryptographic context
   * @param context.walletInstanceAttestation: the Wallet Instance's attestation
   * @param context.redirectUri: the redirect URI
   * @param context.appFetch: (optional) the fetch implementation
   * @returns The URI to which the end user should be redirected to start the authentication flow, along with additional authentication parameters
   */
  startUserAuthorization(
    issuerConf: IssuerConfig,
    credentialIds: string[],
    proof:
      | { proofType: "none" }
      | { proofType: "mrtd-pop"; idpHinting: string },
    context: {
      wiaCryptoContext: CryptoContext;
      walletInstanceAttestation: string;
      redirectUri: string;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<{
    issuerRequestUri: string;
    clientId: string;
    codeVerifier: string;
    credentialDefinition: AuthorizationDetail[];
  }>;
}
