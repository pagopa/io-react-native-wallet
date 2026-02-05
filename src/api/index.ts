import * as CredentialsCatalogue from "../credentials-catalogue";
import * as Trustmark from "../credential/trustmark";

export type ItwVersion = "1.0.0" | "1.3.3";

/**
 * The Wallet public API.
 */
export interface IoWalletApi {
  CredentialsCatalogue: CredentialsCatalogue.CredentialsCatalogueApi;
  Trustmark: Trustmark.TrustmarkApi;
}

/**
 * The Wallet API implementations grouped by IT-Wallet specifications version.
 */
export const ioWalletApiByVersion: Record<ItwVersion, IoWalletApi> = {
  "1.0.0": {
    CredentialsCatalogue: CredentialsCatalogue.V1_0_0,
    Trustmark: Trustmark.V1_0_0,
  },
  "1.3.3": {
    CredentialsCatalogue: CredentialsCatalogue.V1_3_3,
    Trustmark: Trustmark.V1_3_3,
  },
};
