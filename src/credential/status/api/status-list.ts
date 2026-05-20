import type { Out } from "../../../utils/misc";
import type { CredentialFormat } from "../../../credential/issuance/api";
import type { JWK } from "../../../utils/jwk";

export interface StatusListApi {
  isSupported: true;

  /**
   * Get the status list from the credential. This function fetches the list
   * from the uri found in the credential's `status` claim.
   * @example
   * {
   *   "status": {
   *     "status_list": {
   *       "idx": 1,
   *       "uri": "https://example/status-list"
   *     }
   *   }
   * }
   * @since 1.3.3
   * @param credential The credential to get the status list for
   * @param format The credential format
   * @param context.appFetch Optional fetch function to use for the network request
   * @returns The raw status list, the index of the credential and other metadata
   */
  get(
    credential: string,
    format: CredentialFormat,
    context?: {
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<{
    statusList: string;
    format: "jwt";
    uri: string;
    idx: number;
  }>;

  /**
   * Verifies the signature of a status list and extract the status at the specified index.
   * @since 1.3.3
   * @param keys The JSON Web Key Set to verify the status list signature
   * @param statusListParams The raw status list, the index to read and other metadata
   * @return The status of the credential and the raw status bit in hexadecimal format (e.g. "0x01")
   */
  verifyAndParse(
    keys: JWK[],
    statusListParams: Out<StatusListApi["get"]>
  ): Promise<{
    statusBit: string;
    status: string;
  }>;
}
