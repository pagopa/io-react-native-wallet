import { z } from "zod";

import { EntityStatement } from "../common/types";
import { createVerifyTrustChain } from "../common/verify-chain";
import { EntityConfiguration, TrustAnchorEntityConfiguration } from "./types";

export const verifyTrustChain = createVerifyTrustChain({
  EntityConfigurationShape: EntityConfiguration,
  EntityStatementShape: EntityStatement,
  FirstElementShape: EntityConfiguration,
  LastElementShape: z.union([EntityStatement, TrustAnchorEntityConfiguration]),
  MiddleElementShape: EntityStatement,
});
