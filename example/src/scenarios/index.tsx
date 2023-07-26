import getPid from "./get-pid";
import getAttestation from "./get-attestation";
import verifyPid from "./verify-pid";
import decodePid from "./decode-pid";

const scenarios = {
  getPid,
  getAttestation,
  verifyPid,
  decodePid,
};

export default scenarios;
export type { ScenarioRunner } from "./types";
