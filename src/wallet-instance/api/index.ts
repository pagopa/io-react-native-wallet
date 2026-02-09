import type { IntegrityContext } from "../../utils/integrity";

export type WalletInstanceStatus = {
  id: string;
  is_revoked: boolean;
  revocation_reason?:
    | "CERTIFICATE_REVOKED_BY_ISSUER"
    | "NEW_WALLET_INSTANCE_CREATED"
    | "REVOKED_BY_USER";
};

export interface WalletInstanceApi {
  /**
   * Create a new Wallet Instance.
   */
  createWalletInstance(context: {
    integrityContext: IntegrityContext;
    walletProviderBaseUrl: string;
    appFetch?: GlobalFetch["fetch"];
  }): Promise<string>;

  /**
   * Revoke a Wallet Instance by ID.
   * @param context.id The Wallet Instance ID. It matches the hardware key tag used for creation.
   */
  revokeWalletInstance(context: {
    id: string;
    walletProviderBaseUrl: string;
    appFetch?: GlobalFetch["fetch"];
  }): Promise<void>;

  /**
   * Get the status of a Wallet Instance by ID.
   * @param context.id The Wallet Instance ID. It matches the hardware key tag used for creation.
   * @returns Details on the status of the Wallet Instance
   */
  getWalletInstanceStatus(context: {
    id: string;
    walletProviderBaseUrl: string;
    appFetch?: GlobalFetch["fetch"];
  }): Promise<WalletInstanceStatus>;

  /**
   * Get the status of the current Wallet Instance.
   * @returns Details on the status of the current Wallet Instance
   */
  getCurrentWalletInstanceStatus(context: {
    walletProviderBaseUrl: string;
    appFetch?: GlobalFetch["fetch"];
  }): Promise<WalletInstanceStatus>;
}
