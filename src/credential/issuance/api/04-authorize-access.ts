import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { IssuerConfig } from "./IssuerConfig";
import type { TokenResponse } from "../types";

export interface AuthorizeAccessApi {
  /**
   * Creates and sends the DPoP Proof JWT to be presented with the authorization code to the /token endpoint of the authorization server
   * for requesting the issuance of an access token bound to the public key of the Wallet Instance contained within the DPoP.
   * This enables the Wallet Instance to request a digital credential.
   * The DPoP Proof JWT is generated according to the section 4.3 of the DPoP RFC 9449 specification.
   * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
   * @param code The authorization code returned by {@link completeUserAuthorizationWithQueryMode} or {@link completeUserAuthorizationWithFormPost}
   * @param clientId The client id returned by {@link startUserAuthorization}
   * @param redirectUri The redirect URI which is the custom URL scheme that the Wallet Instance is registered to handle
   * @param codeVerifier The code verifier returned by {@link startUserAuthorization}
   * @param context.walletInstanceAttestation The Wallet Instance's attestation
   * @param context.wiaCryptoContext The Wallet Instance's crypto context
   * @param context.dPopCryptoContext The DPoP crypto context
   * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
   * @throws {ValidationFailed} if an error occurs while parsing the token response
   * @throws {IssuerResponseError} with a specific code for more context
   * @return The token response containing the access token along with the token request signed with DPoP which has to be used in the {@link obtainCredential} step.
   */
  authorizeAccess(
    issuerConf: IssuerConfig,
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier: string,
    context: {
      walletInstanceAttestation: string;
      wiaCryptoContext: CryptoContext;
      dPopCryptoContext: CryptoContext;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<{ accessToken: TokenResponse }>;
}
