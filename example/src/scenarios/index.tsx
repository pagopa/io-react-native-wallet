import getPid from "./get-pid";
import getAttestation from "./get-attestation";
import verifyPid from "./verify-pid";
import decodePid from "./decode-pid";
import decodeQR from "./decode-qr-from-rp";
import authenticationToRP from "./cross-device-flow-with-rp";

const scenarios = {
  getPid,
  getAttestation,
  verifyPid,
  decodePid,
  decodeQR,
  authenticationToRP,
};

export default scenarios;
export type { ScenarioRunner } from "./types";
