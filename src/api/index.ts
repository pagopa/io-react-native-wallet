import * as CredentialIssuance from "../credential/issuance";
import * as CredentialsOffer from "../credential/offer";
import * as RemotePresentation from "../credential/presentation";
import * as CredentialStatus from "../credential/status";
import * as Trustmark from "../credential/trustmark";
import * as CredentialsCatalogue from "../credentials-catalogue";
import * as Trust from "../trust";
import * as WalletInstance from "../wallet-instance";
import * as WIA from "../wallet-instance-attestation";
import * as WUA from "../wallet-unit-attestation";

/**
 * The Wallet public API.
 */
export interface IoWalletApi {
  CredentialIssuance: CredentialIssuance.IssuanceApi;
  CredentialsCatalogue: CredentialsCatalogue.CredentialsCatalogueApi;
  CredentialsOffer: CredentialsOffer.OfferApi;
  CredentialStatus: CredentialStatus.CredentialStatusApi;
  RemotePresentation: RemotePresentation.RemotePresentationApi;
  Trust: Trust.TrustApi;
  Trustmark: Trustmark.TrustmarkApi;
  WalletInstance: WalletInstance.WalletInstanceApi;
  WalletInstanceAttestation: WIA.WalletInstanceAttestationApi;
  WalletUnitAttestation: WUA.WalletUnitAttestationApi;
}

export type ItwVersion = "1.0.0" | "1.4.4";

/**
 * The Wallet API implementations grouped by IT-Wallet specifications version.
 */
export const ioWalletApiByVersion: Record<ItwVersion, IoWalletApi> = {
  "1.0.0": {
    CredentialIssuance: CredentialIssuance.V1_0_0,
    CredentialsCatalogue: CredentialsCatalogue.V1_0_0,
    CredentialsOffer: CredentialsOffer.V1_0_0,
    CredentialStatus: CredentialStatus.V1_0_0,
    RemotePresentation: RemotePresentation.V1_0_0,
    Trust: Trust.V1_0_0,
    Trustmark: Trustmark.V1_0_0,
    WalletInstance: WalletInstance.V1_0_0,
    WalletInstanceAttestation: WIA.V1_0_0,
    WalletUnitAttestation: WUA.V1_0_0,
  },
  "1.4.4": {
    CredentialIssuance: CredentialIssuance.V1_4_4,
    CredentialsCatalogue: CredentialsCatalogue.V1_4_4,
    CredentialsOffer: CredentialsOffer.V1_4_4,
    CredentialStatus: CredentialStatus.V1_4_4,
    RemotePresentation: RemotePresentation.V1_4_4,
    Trust: Trust.V1_0_0,
    Trustmark: Trustmark.V1_4_4,
    WalletInstance: WalletInstance.V1_3_3,
    WalletInstanceAttestation: WIA.V1_3_3,
    WalletUnitAttestation: WUA.V1_3_3,
  },
};
