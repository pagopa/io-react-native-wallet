import type { IntegrityContext } from "../../utils/integrity";

export interface WalletInstanceApi {
  /**
   * Create a new Wallet Instance.
   */
  createWalletInstance(context: {
    appFetch?: GlobalFetch["fetch"];
    integrityContext: IntegrityContext;
    isRenewal?: boolean;
    walletProviderBaseUrl: string;
  }): Promise<string>;

  /**
   * Get the status of the current Wallet Instance.
   * @returns Details on the status of the current Wallet Instance
   */
  getCurrentWalletInstanceStatus(context: {
    appFetch?: GlobalFetch["fetch"];
    walletProviderBaseUrl: string;
  }): Promise<WalletInstanceStatus>;

  /**
   * Get the status of a Wallet Instance by ID.
   * @param context.id The Wallet Instance ID. It matches the hardware key tag used for creation.
   * @returns Details on the status of the Wallet Instance
   */
  getWalletInstanceStatus(context: {
    appFetch?: GlobalFetch["fetch"];
    id: string;
    walletProviderBaseUrl: string;
  }): Promise<WalletInstanceStatus>;

  /**
   * Revoke a Wallet Instance by ID.
   * @param context.id The Wallet Instance ID. It matches the hardware key tag used for creation.
   */
  revokeWalletInstance(context: {
    appFetch?: GlobalFetch["fetch"];
    id: string;
    walletProviderBaseUrl: string;
  }): Promise<void>;
}

export interface WalletInstanceStatus {
  id: string;
  is_revoked: boolean;
  revocation_reason?:
    | "CERTIFICATE_REVOKED_BY_ISSUER"
    | "NEW_WALLET_INSTANCE_CREATED"
    | "REVOKED_BY_USER"
    | "WALLET_INSTANCE_RENEWAL";
}
