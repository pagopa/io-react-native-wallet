import * as z from "zod";
import { CredentialOfferParams } from "./types";

export interface StartFlowApi {
  /**
   * StartFlowApi defines the interface for starting a credential offer flow.
   * @param encodedUrl - The encoded URL containing the credential offer information.
   * @returns An object containing the credential offer by reference or by value.
   */
  startFlow(encodedUrl: string): z.infer<typeof CredentialOfferParams>;
}
