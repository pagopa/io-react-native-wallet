// polyfill due to known bugs on URL implementation for react native
// https://github.com/facebook/react-native/issues/24428
import "react-native-url-polyfill/auto";

import * as PID from "./pid";
import * as RP from "./rp";
import * as Errors from "./utils/errors";
import * as WalletInstanceAttestation from "./wallet-instance-attestation";
import { RelyingPartySolution } from "./rp";
import { RpEntityConfiguration } from "./rp/types";
import { verifyTrustChain, getEntityConfiguration } from "./trust";
import {
  EntityConfiguration,
  EntityStatement,
  TrustAnchorEntityConfiguration,
} from "./trust/types";

export {
  PID,
  RP,
  WalletInstanceAttestation,
  Errors,
  RelyingPartySolution,
  verifyTrustChain,
  getEntityConfiguration,
  EntityConfiguration,
  EntityStatement,
  RpEntityConfiguration,
  TrustAnchorEntityConfiguration,
};
