import type { JWK } from "../../../utils/jwk";
import type { RelyingPartyConfig } from "./RelyingPartyConfig";

export interface RetrieveRpJwksApi {
  /**
   * Fetches the JSON Web Key Set (JWKS) from the Relying Party's Entity Configuration.
   * @since 1.0.0
   * @param rpConfig - The Relying Party's common configuration,
   * @returns An object containing an array of JSON Web Keys (JWKs).
   */
  getJwksFromRpConfig(rpConfig: RelyingPartyConfig): { keys: JWK[] };

  /**
   * Fetches the JSON Web Key Set (JWKS) based on the provided Request Object encoded as a JWT.
   *
   * The retrieval process follows these steps in order:
   * 1. **Direct JWK Retrieval**: If the JWT's protected header contains a `jwk` attribute, it uses this key directly.
   * 2. **X.509 Certificate Retrieval**: If the protected header includes an `x5c` attribute, it extracts the JWKs from the provided X.509 certificate chain.
   * @since 1.3.3
   *
   * @param requestObjectEncodedJwt - The Request Object encoded as a JWT.
   * @returns An object containing an array of JSON Web Keys (JWKs).
   */
  getJwksFromRequestObject(requestObjectEncodedJwt: string): { keys: JWK[] };
}
