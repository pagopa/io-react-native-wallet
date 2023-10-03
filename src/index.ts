// polyfill due to known bugs on URL implementation for react native
// https://github.com/facebook/react-native/issues/24428
import "react-native-url-polyfill/auto";

import * as PID from "./pid";
import * as RP from "./rp";
import * as Errors from "./utils/errors";
import * as WalletInstanceAttestation from "./wallet-instance-attestation";
import * as RelyingPartySolution from "./rp";
import {
  verifyTrustChain,
  getEntityConfiguration,
  getCredentialIssuerEntityConfiguration,
  getRelyingPartyEntityConfiguration,
  getTrustAnchorEntityConfiguration,
  getWalletProviderEntityConfiguration,
} from "./trust";
import {
  RelyingPartyEntityConfiguration,
  WalletProviderEntityConfiguration,
  TrustAnchorEntityConfiguration,
  CredentialIssuerEntityConfiguration,
} from "./trust/types";
import { createCryptoContextFor } from "./utils/crypto";

export {
  PID,
  RP,
  WalletInstanceAttestation,
  Errors,
  RelyingPartySolution,
  verifyTrustChain,
  getEntityConfiguration,
  getCredentialIssuerEntityConfiguration,
  getRelyingPartyEntityConfiguration,
  getTrustAnchorEntityConfiguration,
  getWalletProviderEntityConfiguration,
  createCryptoContextFor,
  RelyingPartyEntityConfiguration,
  WalletProviderEntityConfiguration,
  TrustAnchorEntityConfiguration,
  CredentialIssuerEntityConfiguration,
};
