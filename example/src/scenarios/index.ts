import getEntityStatement from "./poc/get-entity-statement";
import getPid from "./poc/get-pid";
import getAttestation from "./production/get-attestation";
import verifyPid from "./poc/verify-pid";
import decodePid from "./poc/decode-pid";
import decodeCredentialSdJwt from "./poc/decode-credential-sdjwt";
import verifyCredentialSdJwt from "./poc/verify-credential-sdjwt";
import decodeQR from "./poc/decode-qr-from-rp";
import authenticationToRP from "./poc/cross-device-flow-with-rp";
import getCredential from "./poc/get-credential";
import getMultipleCredential from "./poc/get-credential-multiple";
import createWalletInstance from "./production/create-wallet-instance";
import TestScenario from "./TestScenario";
import prepareIntegrityContext from "./production/prepare-integrity-context";

const scenarios = {
  poc: {
    getPid,
    getAttestation,
    getCredential,
    getMultipleCredential,
    verifyPid,
    decodePid,
    decodeQR,
    authenticationToRP,
    getEntityStatement,
    decodeCredentialSdJwt,
    verifyCredentialSdJwt,
  },
  prod: {
    prepareIntegrityContext,
    createWalletInstance,
    getAttestation,
  },
};

export default scenarios;
export type { ScenarioRunner } from "./types";
export { TestScenario };
