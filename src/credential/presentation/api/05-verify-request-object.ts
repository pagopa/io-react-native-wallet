import type { RelyingPartyConfig } from "./RelyingPartyConfig";
import type { RequestObject } from "./types";

export interface VerifyRequestObjectApi {
  /**
   * Function to verify the Request Object's validity, from the signature to the required properties.
   * @since 1.0.0
   *
   * @param requestObjectEncodedJwt The Request Object in JWT format
   * @param context.clientId The client ID to verify
   * @param context.rpConf The Entity Configuration of the Relying Party
   * @param context.state Optional state
   * @returns The verified Request Object
   * @throws {InvalidRequestObjectError} if the Request Object cannot be validated
   */
  verifyRequestObject(
    requestObjectEncodedJwt: string,
    context: {
      clientId: string;
      rpConf: RelyingPartyConfig;
      state?: string;
    }
  ): Promise<{ requestObject: RequestObject }>;
}
