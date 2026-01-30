import { z } from "zod";
import { EntityStatement } from "../common/types";
import { createVerifyTrustChain } from "../common/verify-chain";
import { EntityConfiguration, TrustAnchorEntityConfiguration } from "./types";

export const verifyTrustChain = createVerifyTrustChain({
  EntityStatementShape: EntityStatement,
  EntityConfigurationShape: EntityConfiguration,
  FirstElementShape: EntityConfiguration,
  MiddleElementShape: EntityStatement,
  LastElementShape: z.union([EntityStatement, TrustAnchorEntityConfiguration]),
});
