import * as WalletInstance from "../wallet-instance";
import * as WIA from "../wallet-instance-attestation";
import * as Trust from "../trust";
import * as CredentialIssuance from "../credential/issuance";
import * as RemotePresentation from "../credential/presentation";
import * as CredentialsCatalogue from "../credentials-catalogue";
import * as CredentialsOffer from "../credential/offer";

export type ItwVersion = "1.0.0" | "1.3.3";

/**
 * The Wallet public API.
 */
export interface IoWalletApi {
  WalletInstance: WalletInstance.WalletInstanceApi;
  WalletInstanceAttestation: WIA.WalletInstanceAttestationApi;
  Trust: Trust.TrustApi;
  CredentialIssuance: CredentialIssuance.IssuanceApi;
  RemotePresentation: RemotePresentation.RemotePresentationApi;
  CredentialsCatalogue: CredentialsCatalogue.CredentialsCatalogueApi;
  CredentialsOffer: CredentialsOffer.OfferApi;
}

/**
 * The Wallet API implementations grouped by IT-Wallet specifications version.
 */
export const ioWalletApiByVersion: Record<ItwVersion, IoWalletApi> = {
  "1.0.0": {
    WalletInstance: WalletInstance.V1_0_0,
    WalletInstanceAttestation: WIA.V1_0_0,
    Trust: Trust.V1_0_0,
    CredentialIssuance: CredentialIssuance.V1_0_0,
    RemotePresentation: RemotePresentation.V1_0_0,
    CredentialsCatalogue: CredentialsCatalogue.V1_0_0,
    // TODO: replace v1.3.3 with empty v1.0.0 implementation
    CredentialsOffer: CredentialsOffer.V1_3_3,
  },
  // TODO: replace v1.0.0 with v1.3.3 implementations
  "1.3.3": {
    WalletInstance: WalletInstance.V1_3_3,
    WalletInstanceAttestation: WIA.V1_3_3,
    Trust: Trust.V1_0_0,
    CredentialIssuance: CredentialIssuance.V1_0_0,
    RemotePresentation: RemotePresentation.V1_0_0,
    CredentialsCatalogue: CredentialsCatalogue.V1_3_3,
    CredentialsOffer: CredentialsOffer.V1_3_3,
  },
};
