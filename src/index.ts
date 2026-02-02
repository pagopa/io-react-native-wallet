import type { AuthorizationContext } from "./utils/auth";
import { fixBase64EncodingOnKey } from "./utils/jwk";
// polyfill due to known bugs on URL implementation for react native
// https://github.com/facebook/react-native/issues/24428
import "react-native-url-polyfill/auto";

import * as Credential from "./credential";
import * as PID from "./pid";
import * as SdJwt from "./sd-jwt";
import * as Mdoc from "./mdoc";
import * as Errors from "./utils/errors";
import * as WalletInstanceAttestation from "./wallet-instance-attestation";
import * as WalletInstance from "./wallet-instance";
import * as Logging from "./utils/logging";
import { AuthorizationDetail, AuthorizationDetails } from "./utils/par";
import { createCryptoContextFor } from "./utils/crypto";
import type { IntegrityContext } from "./utils/integrity";

export {
  SdJwt,
  Mdoc,
  PID,
  Credential,
  WalletInstanceAttestation,
  WalletInstance,
  Errors,
  createCryptoContextFor,
  AuthorizationDetail,
  AuthorizationDetails,
  fixBase64EncodingOnKey,
  Logging,
};

export type { IntegrityContext, AuthorizationContext };

export type * from "./api";
export * as CredentialsCatalogue from "./credentials-catalogue";
export * as Trust from "./trust";

// Export SDK entrypoint
export { IoWallet } from "./IoWallet";
