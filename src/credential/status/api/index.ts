import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { CredentialFormat, IssuerConfig } from "../../issuance/api";
import type { SupportedSdJwtLegacyFormat } from "../../../sd-jwt/types";
import type { Out } from "../../../utils/misc";
import type { ParsedStatusAssertion } from "./types";

// TODO: decide whether to keep status assertion and status list separate or merge them into a single getStatus() function
export interface CredentialStatusApi {
  /**
   * Get the status assertion of a digital credential.
   * @since 1.0.0
   * @deprecated since 1.3.3 - Use {@link getStatusFromTokenStatusList}
   *
   * @param issuerConf - The issuer's configuration
   * @param credential - The credential to be verified
   * @param format - The format of the credential, e.g. "sd-jwt"
   * @param context.credentialCryptoContext - The credential's crypto context
   * @param context.wiaCryptoContext - The Wallet Attestation's crypto context
   * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
   * @returns The credential status assertion
   * @throws {IssuerResponseError} with a specific code for more context
   */
  getStatusAssertion(
    issuerConf: IssuerConfig,
    credential: string,
    format: CredentialFormat | SupportedSdJwtLegacyFormat,
    context: {
      credentialCryptoContext: CryptoContext;
      wiaCryptoContext: CryptoContext;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<{ statusAssertion: string }>;

  /**
   * Given a status assertion, verifies that:
   * - It's in the supported format;
   * - The assertion is correctly signed;
   * - It's bound to the given key.
   * @since 1.0.0
   * @deprecated since 1.3.3 - Use {@link getStatusFromTokenStatusList}
   *
   * @param issuerConf The Issuer configuration returned by {@link evaluateIssuerTrust}
   * @param statusAssertion The encoded status assertion returned by {@link getStatusAssertion}
   * @param credential The encoded credential whose status is being verified
   * @param format The credential format, e.g. "dc+sd-jwt"
   * @returns A parsed status assertion
   * @throws {IoWalletError} If the credential signature is not verified with the Issuer key set
   * @throws {IssuerResponseError} If the status assertion contains an error or the credential status is invalid
   */
  verifyAndParseStatusAssertion(
    issuerConf: IssuerConfig,
    statusAssertion: Out<CredentialStatusApi["getStatusAssertion"]>,
    credential: string,
    format: CredentialFormat | SupportedSdJwtLegacyFormat
  ): Promise<{ parsedStatusAssertion: ParsedStatusAssertion }>;

  /**
   * // TODO: to be implemented
   * Get the status list from a credential.
   * @since 1.3.3
   */
  getStatusFromTokenStatusList(credential: string): Promise<{ status: number }>;
}
