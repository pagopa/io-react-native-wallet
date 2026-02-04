import * as Trust from "../trust";
import * as RemotePresentation from "../credential/presentation";
import * as CredentialsCatalogue from "../credentials-catalogue";

export type ItwVersion = "1.0.0" | "1.3.3";

/**
 * The Wallet public API.
 */
export interface IoWalletApi {
  Trust: Trust.TrustApi;
  CredentialsCatalogue: CredentialsCatalogue.CredentialsCatalogueApi;
  RemotePresentation: RemotePresentation.RemotePresentationApi;
}

/**
 * The Wallet API implementations grouped by IT-Wallet specifications version.
 */
export const ioWalletApiByVersion: Record<ItwVersion, IoWalletApi> = {
  "1.0.0": {
    Trust: Trust.V1_0_0,
    RemotePresentation: RemotePresentation.V1_0_0,
    CredentialsCatalogue: CredentialsCatalogue.V1_0_0,
  },
  "1.3.3": {
    Trust: Trust.V1_0_0,
    RemotePresentation: RemotePresentation.V1_0_0,
    CredentialsCatalogue: CredentialsCatalogue.V1_3_3,
  },
};
