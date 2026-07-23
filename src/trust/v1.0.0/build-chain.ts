import { createBuildTrustChain } from "../common/build-chain";
import { EntityStatement } from "../common/types";
import { EntityConfiguration } from "./types";

export const buildTrustChain = createBuildTrustChain({
  EntityConfigurationShape: EntityConfiguration,
  EntityStatementShape: EntityStatement,
});
