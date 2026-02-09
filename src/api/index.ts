import * as CredentialsCatalogue from "../credentials-catalogue";

export type ItwVersion = "1.0.0" | "1.3.3";

/**
 * The Wallet public API.
 */
export interface IoWalletApi {
  CredentialsCatalogue: CredentialsCatalogue.CredentialsCatalogueApi;
}

/**
 * The Wallet API implementations grouped by IT-Wallet specifications version.
 */
export const ioWalletApiByVersion: Record<ItwVersion, IoWalletApi> = {
  "1.0.0": {
    CredentialsCatalogue: CredentialsCatalogue.V1_0_0,
  },
  "1.3.3": {
    CredentialsCatalogue: CredentialsCatalogue.V1_3_3,
  },
};
