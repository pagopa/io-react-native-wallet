import type { AuthorizationContext } from "./utils/auth";
import type { IntegrityContext } from "./utils/integrity";
// polyfill due to known bugs on URL implementation for react native
// https://github.com/facebook/react-native/issues/24428
import "react-native-url-polyfill/auto";

import * as CredentialIssuance from "./credential/issuance";
import * as CredentialOffer from "./credential/offer";
import * as RemotePresentation from "./credential/presentation";
import * as CredentialStatus from "./credential/status";
import * as Trustmark from "./credential/trustmark";
import * as CredentialsCatalogue from "./credentials-catalogue";
import * as KeyAttestation from "./key-attestation";
import * as Mdoc from "./mdoc";
import * as SdJwt from "./sd-jwt";
import * as Trust from "./trust";
import {
  createSignerFor,
  getJwkFromCertificateChain,
  type Signer,
} from "./utils/crypto";
import * as Errors from "./utils/errors";
import { fixBase64EncodingOnKey } from "./utils/jwk";
import * as Logging from "./utils/logging";
import { AuthorizationDetail, AuthorizationDetails } from "./utils/par";
import * as WalletInstance from "./wallet-instance";
import * as WalletInstanceAttestation from "./wallet-instance-attestation";

export {
  AuthorizationDetail,
  AuthorizationDetails,
  createSignerFor,
  CredentialIssuance,
  CredentialOffer,
  CredentialsCatalogue,
  CredentialStatus,
  Errors,
  fixBase64EncodingOnKey,
  getJwkFromCertificateChain,
  KeyAttestation,
  Logging,
  Mdoc,
  RemotePresentation,
  SdJwt,
  Trust,
  Trustmark,
  WalletInstance,
  WalletInstanceAttestation,
};

export type { AuthorizationContext, IntegrityContext, Signer };

export type * from "./api";

// Export SDK entrypoint
export { IoWallet } from "./IoWallet";
