import TestScenario from "./component/TestScenario";
import createWalletInstance from "../thunks/create-wallet-instance";
import getAttestation from "../thunks/get-attestation";
import prepareIntegrityContext from "./prepare-integrity-context";
import getPid from "../thunks/get-credential";
import getCredential from "../thunks/get-crendential";
import getCredentialStatusAttestation from "./get-credential-status-attestation";

const scenarios = {
  prepareIntegrityContext,
  createWalletInstance,
  getAttestation,
  getPid,
  getCredentialStatusAttestation,
  getCredential,
};

export default scenarios;
export type { ScenarioRunner } from "./types";
export { TestScenario };
