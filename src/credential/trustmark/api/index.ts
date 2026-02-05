import { type GetCredentialTrustmarkJwt } from "./Trustmark";

export interface TrustmarkApi {
  /**
   * Generates a trustmark signed JWT, which is used to verify the authenticity of a credential.
   *
   * @since 1.0.0
   */
  getCredentialTrustmark: GetCredentialTrustmarkJwt;
}

export { type GetCredentialTrustmarkJwt };
