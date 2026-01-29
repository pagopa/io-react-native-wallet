import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { IntegrityContext } from "../../utils/integrity";

type WalletAttestation =
  | { wallet_attestation: string; format: string }
  | { wallet_app_attestation: string; format: string }
  | { wallet_unit_attestation: string; format: string };

export interface WalletInstanceAttestationApi {
  /**
   * Request a Wallet Instance Attestation (WIA) to the Wallet provider.
   * The Wallet Attestation may be issued in different formats and components (Wallet App and Wallet Unit).
   *
   * @param params.wiaCryptoContext The key pair associated with the WIA. Will be use to prove the ownership of the attestation.
   * @param params.appFetch (optional) Http client
   * @param walletProviderBaseUrl Base url for the Wallet Provider
   * @returns The retrieved Wallet Instance Attestation tokens
   * @throws {WalletProviderResponseError} with a specific code for more context
   */
  getAttestation(ctx: {
    wiaCryptoContext: CryptoContext;
    integrityContext: IntegrityContext;
    walletProviderBaseUrl: string;
    appFetch?: GlobalFetch["fetch"];
  }): Promise<WalletAttestation[]>;
}
