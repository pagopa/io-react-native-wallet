import getPid from "./get-pid";
import getAttestation from "./get-attestation";
import verifyPid from "./verify-pid";
import decodePid from "./decode-pid";
import decodeQR from "./decode-qr-from-rp";

const scenarios = {
  getPid,
  getAttestation,
  verifyPid,
  decodePid,
  decodeQR,
};

export default scenarios;
export type { ScenarioRunner } from "./types";
