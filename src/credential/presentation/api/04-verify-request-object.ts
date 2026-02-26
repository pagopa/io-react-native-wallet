import type { RelyingPartyConfig } from "./RelyingPartyConfig";
import type { RequestObject } from "./types";

export interface VerifyRequestObjectApi {
  /**
   * Function to verify the Request Object's validity, from the signature to the required properties.
   * @since 1.0.0
   *
   * @param requestObjectEncodedJwt The Request Object in JWT format
   * @param params.clientId The client ID to verify
   * @param params.rpConf The Entity Configuration of the Relying Party
   * @param params.state Optional state
   * @returns The verified Request Object
   * @throws {InvalidRequestObjectError} if the Request Object cannot be validated
   */
  verifyRequestObject(
    requestObjectEncodedJwt: string,
    params: {
      clientId: string;
      rpConf: RelyingPartyConfig;
      state?: string;
    }
  ): Promise<{ requestObject: RequestObject }>;
}
