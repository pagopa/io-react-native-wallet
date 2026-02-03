import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { IssuerConfig } from "../IssuerConfig";
import type {
  IasPayload,
  MrtdPayload,
  MrtdPoPChallenge,
  MrtdPopVerificationResult,
  MrtdProofChallengeInfo,
} from "./types";

export interface MRTDPoPApi {
  /**
   * Verifies and parses the payload of a MRTD Proof Challenge Info JWT obtained after the primary authentication.
   *
   * This function performs the following steps:
   * 1. Validates the JWT signature using the issuer's JWKS.
   * 2. Decodes the JWT and parses its structure according to the {@link MrtdProofChallengeInfo} schema.
   * 3. Verifies that the `aud` claim matches the client's public key ID.
   * 4. Checks that the JWT is not expired and was not issued in the future.
   *
   * @param issuerConf - The issuer configuration containing the JWKS for signature verification.
   * @param challengeInfoJwt - The JWT string representing the MRTD Proof Challenge Info.
   * @param context - The context containing the WIA crypto context used to retrieve the client public key.
   * @returns The parsed payload of the MRTD Proof Challenge Info JWT.
   * @throws {Error} If the JWT signature is invalid, the structure is malformed, the `aud` claim does not match,
   * or the JWT is expired/not yet valid.
   */
  verifyAndParseChallengeInfo(
    issuerConf: IssuerConfig,
    challengeInfoJwt: string,
    context: {
      wiaCryptoContext: CryptoContext;
    }
  ): Promise<MrtdProofChallengeInfo>;

  /**
   * Initializes the MRTD challenge with the data received from the issuer after the primary authentication.
   * This function must be called after {@link verifyAndParseChallengeInfo}.
   *
   * @param issuerConf - The issuer configuration containing the JWKS for signature verification.
   * @param initUrl - The endpoint to call to initialize the challenge.
   * @param mrtd_auth_session - Session identifier for session binding obtained from the MRTD Proof JWT.
   * @param mrtd_pop_jwt_nonce - Nonce value obtained from the MRTD Proof JWT.
   * @param context - The context containing the WIA crypto context used to retrieve the client public key,
   * the wallet instance attestation and an optional fetch implementation.
   * @returns The payload of the MRTD PoP Challenge JWT.
   */
  initChallenge(
    issuerConf: IssuerConfig,
    initUrl: string,
    mrtd_auth_session: string,
    mrtd_pop_jwt_nonce: string,
    context: {
      wiaCryptoContext: CryptoContext;
      walletInstanceAttestation: string;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<MrtdPoPChallenge>;

  /**
   * Validates the MRTD signed challenge by sending the MRTD and IAS payloads to the issuer.
   * This function must be called after {@link initChallenge} and after obtaining the MRTD and IAS payloads
   * through the CIE PACE process.
   *
   * @param issuerConf - The issuer configuration containing the JWKS for signature verification.
   * @param verifyUrl - The endpoint to call to validate the challenge.
   * @param mrtd_auth_session - Session identifier for session binding obtained from the MRTD Proof JWT.
   * @param mrtd_pop_nonce - Nonce value obtained from the MRTD Proof JWT.
   * @param mrtd - MRTD validation data containing Data Groups and SOD.
   * @param ias - IAS validation data containing Anti-Cloning Public Key, and SOD.
   * @param context - The context containing the WIA crypto context used to retrieve the client public key,
   * the wallet instance attestation and an optional fetch implementation.
   * @returns The MRTD PoP Verification Result containing the validation nonce and redirect URI to complete the flow.
   */
  validateChallenge(
    issuerConf: IssuerConfig,
    verifyUrl: string,
    mrtd_auth_session: string,
    mrtd_pop_nonce: string,
    mrtd: MrtdPayload,
    ias: IasPayload,
    context: {
      wiaCryptoContext: CryptoContext;
      walletInstanceAttestation: string;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<MrtdPopVerificationResult>;

  /**
   * WARNING: This function must be called after {@link validateChallenge}. The generated authUrl must be used to open a browser or webview capable of catching the redirectSchema to perform a get request to the authorization endpoint.
   * Builds the callback URL to which the end user should be redirected to continue the authentication flow after the MRTD challenge validation.
   * @param redirectUri - The redirect URI provided by the issuer after the challenge validation to continue the authentication flow.
   * @param valPopNonce - The MRTD validation PoP nonce obtained from the challenge validation response.
   * @param authSession - The MRTD authentication session identifier used for session binding.
   * @returns An object containing the callback URL
   */
  buildChallengeCallbackUrl(
    redirectUri: string,
    valPopNonce: string,
    authSession: string
  ): Promise<{ callbackUrl: string }>;
}

export * from "./types";
