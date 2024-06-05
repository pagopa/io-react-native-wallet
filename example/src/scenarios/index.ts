import createWalletInstance from "./create-wallet-instance";
import TestScenario from "./TestScenario";
import prepareIntegrityContext from "./prepare-integrity-context";
import getAttestation from "./production/get-attestation";

const scenarios = {
  prepareIntegrityContext,
  createWalletInstance,
  getAttestation,
};

export default scenarios;
export type { ScenarioRunner } from "./types";
export { TestScenario };
