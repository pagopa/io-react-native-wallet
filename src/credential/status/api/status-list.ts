import type { CredentialFormat } from "../../../credential/issuance/api";
import type { JWK } from "../../../utils/jwk";
import type { StatusList } from "./types";

export interface StatusListApi {
  /**
   * Get the status list token referenced by a credential. This function fetches the list
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
   * @returns The encoded status list token with its credential reference metadata
   */
  get(
    credential: string,
    format: CredentialFormat,
    context?: {
      appFetch?: GlobalFetch["fetch"];
    },
  ): Promise<{
    format: "jwt";
    idx: number;
    statusList: string;
    uri: string;
  }>;

  /**
   * Get a status list token from its uri.
   * @since 1.3.3
   * @param uri The status list uri
   * @param context.appFetch Optional fetch function to use for the network request
   * @returns The encoded status list token
   */
  getByUri(
    uri: string,
    context?: {
      appFetch?: GlobalFetch["fetch"];
    },
  ): Promise<string>;

  /**
   * Extracts the status at the specified index from a decoded status list.
   * @since 1.3.3
   * @param statusList The decoded status list
   * @param idx The index to read
   * @return The status of the credential and the raw status in hexadecimal format (e.g. "0x01")
   */
  getStatus(
    statusList: StatusList["status_list"],
    idx: number,
  ): {
    rawStatus: string;
    status: string;
  };

  /**
   * Extracts the status list entry from a raw credential, i.e. the object containing `uri` and `ìdx`.
   *
   * This method **does not perform any HTTP request** to fetch the list. Use {@link get} or {@link getByUri} instead to fetch it.
   * @since 1.3.3
   * @param credential The raw credential
   * @param format The credential format
   * @returns The status list entry extracted from the credential
   */
  getStatusListEntry(
    credential: string,
    format: CredentialFormat,
  ): Promise<{ idx: number; uri: string }>;

  isSupported: true;

  /**
   * Verifies the signature of a status list token and parses its payload.
   * @since 1.3.3
   * @param keys The JSON Web Key Set to verify the status list signature
   * @param statusList The encoded status list token
   * @returns The decoded status list payload
   */
  verifyAndParse(keys: JWK[], statusList: string): Promise<StatusList>;
}
