import type { JWK } from "../../../utils/jwk";
import type { RelyingPartyConfig } from "../api";

  /**
   * Fetches the JSON Web Key Set (JWKS) from the Relying Party's Entity Configuration.
   * @param rpConfig - The Relying Party's common configuration,
   * @returns An object containing an array of JSON Web Keys (JWKs).
   */
export const getJwksFromRpConfig = (
    rpConfig: RelyingPartyConfig
  ): { keys: JWK[] } => {
    const jwks = rpConfig.keys;
  
    if (!jwks || !Array.isArray(jwks)) {
      throw new Error("JWKS not found in Relying Party configuration.");
    }
  
    return { keys: jwks };
  };
  