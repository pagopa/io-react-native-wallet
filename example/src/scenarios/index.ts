import TestScenario from "./component/TestScenario";
import createWalletInstance from "./create-wallet-instance";
import getAttestation from "./get-attestation";
import prepareIntegrityContext from "./prepare-integrity-context";
import testRedirect from "./test-redirect";

const scenarios = {
  prepareIntegrityContext,
  createWalletInstance,
  getAttestation,
  testRedirect,
};

export default scenarios;
export type { ScenarioRunner } from "./types";
export { TestScenario };
