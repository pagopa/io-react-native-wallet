import type { Out } from "../../../utils/misc";
import type {
  CredentialFormat,
  IssuerConfig,
} from "../../../credential/issuance/api";

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
   * @param credential The credential to get the status list for
   * @param format The credential format
   * @returns The raw status list, the index of the credential and other metadata
   */
  get(
    credential: string,
    format: CredentialFormat
  ): Promise<{
    statusList: string;
    format: "jwt";
    uri: string;
    idx: number;
  }>;

  /**
   * Verifies the signature of a status list and extract the status at the specified index.
   * @param issuerConf The Credential Issuer common configuration
   * @param statusListParams The raw status list, the index to read and other metadata
   */
  verifyAndParse(
    issuerConf: IssuerConfig,
    statusListParams: Out<StatusListApi["get"]>
  ): Promise<{ status: number }>;
}
