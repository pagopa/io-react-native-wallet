import createWalletInstance from "./production/create-wallet-instance";
import TestScenario from "./TestScenario";

const scenarios = {
  createWalletInstance,
};

export default scenarios;
export type { ScenarioRunner } from "./types";
export { TestScenario };
