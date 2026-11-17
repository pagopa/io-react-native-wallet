import * as CredentialIssuance from "../credential/issuance";
import * as CredentialsOffer from "../credential/offer";
import * as RemotePresentation from "../credential/presentation";
import * as CredentialStatus from "../credential/status";
import * as CredentialsCatalogue from "../credentials-catalogue";
import * as KA from "../key-attestation";
import * as Trust from "../trust";
import * as WalletInstance from "../wallet-instance";
import * as WIA from "../wallet-instance-attestation";

/**
 * The Wallet public API.
 */
export interface IoWalletApi {
  CredentialIssuance: CredentialIssuance.IssuanceApi;
  CredentialsCatalogue: CredentialsCatalogue.CredentialsCatalogueApi;
  CredentialsOffer: CredentialsOffer.OfferApi;
  CredentialStatus: CredentialStatus.CredentialStatusApi;
  KeyAttestation: KA.KeyAttestationApi;
  RemotePresentation: RemotePresentation.RemotePresentationApi;
  Trust: Trust.TrustApi;
  WalletInstance: WalletInstance.WalletInstanceApi;
  WalletInstanceAttestation: WIA.WalletInstanceAttestationApi;
}

export type ItwVersion = "1.4.6";

/**
 * The Wallet API implementations grouped by IT-Wallet specifications version.
 */
export const ioWalletApiByVersion: Record<ItwVersion, IoWalletApi> = {
  "1.4.6": {
    CredentialIssuance: CredentialIssuance.V1_4_6,
    CredentialsCatalogue: CredentialsCatalogue.V1_4_6,
    CredentialsOffer: CredentialsOffer.V1_4_6,
    CredentialStatus: CredentialStatus.V1_4_6,
    KeyAttestation: KA.V1_4_6,
    RemotePresentation: RemotePresentation.V1_4_6,
    Trust: Trust.V1_4_6,
    WalletInstance: WalletInstance.V1_4_6,
    WalletInstanceAttestation: WIA.V1_4_6,
  },
};
