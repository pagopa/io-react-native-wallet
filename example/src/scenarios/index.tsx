import getEntityStatement from "./get-entity-statement";
import getPid from "./get-pid";
import getAttestation from "./get-attestation";
import verifyPid from "./verify-pid";
import decodePid from "./decode-pid";
import decodeQR from "./decode-qr-from-rp";
import authenticationToRP from "./cross-device-flow-with-rp";
import getCredential from "./get-credential-2";

const scenarios = {
  getPid,
  getAttestation,
  getCredential,
  verifyPid,
  decodePid,
  decodeQR,
  authenticationToRP,
  getEntityStatement,
};

export default scenarios;
export type { ScenarioRunner } from "./types";
