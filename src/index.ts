// polyfill due to known bugs on URL implementation for react native
// https://github.com/facebook/react-native/issues/24428
import "react-native-url-polyfill/auto";

import * as PID from "./pid";
import * as RP from "./rp";
import * as Errors from "./utils/errors";
import * as WalletInstanceAttestation from "./wallet-instance-attestation";
import { getUnsignedDPop } from "./utils/dpop";
import { RelyingPartySolution } from "./rp";

export {
  PID,
  RP,
  WalletInstanceAttestation,
  Errors,
  getUnsignedDPop,
  RelyingPartySolution,
};
