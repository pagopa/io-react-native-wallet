// polyfill due to known bugs on URL implementation for react native
// https://github.com/facebook/react-native/issues/24428
import "react-native-url-polyfill/auto";

import * as Credential from "./credential";
import * as PID from "./pid";
import * as SdJwt from "./sd-jwt";
import * as Errors from "./utils/errors";
import * as WalletInstanceAttestation from "./wallet-instance-attestation";
import * as Trust from "./trust";
import { AuthorizationDetail, AuthorizationDetails } from "./utils/par";
import { createCryptoContextFor } from "./utils/crypto";

export {
  SdJwt,
  PID,
  Credential,
  WalletInstanceAttestation,
  Errors,
  Trust,
  createCryptoContextFor,
  AuthorizationDetail,
  AuthorizationDetails,
};
