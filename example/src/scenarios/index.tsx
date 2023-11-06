import getEntityStatement from "./get-entity-statement";
import getPid from "./get-pid";
import getAttestation from "./get-attestation";
import verifyPid from "./verify-pid";
import decodePid from "./decode-pid";
import decodeCredentialSdJwt from "./decode-credential-sdjwt";
import verifyCredentialSdJwt from "./verify-credential-sdjwt";
import decodeQR from "./decode-qr-from-rp";
import authenticationToRP from "./cross-device-flow-with-rp";
import getCredential from "./get-credential";

const scenarios = {
  getPid,
  getAttestation,
  getCredential,
  verifyPid,
  decodePid,
  decodeQR,
  authenticationToRP,
  getEntityStatement,
  decodeCredentialSdJwt,
  verifyCredentialSdJwt,
};

export default scenarios;
export type { ScenarioRunner } from "./types";
