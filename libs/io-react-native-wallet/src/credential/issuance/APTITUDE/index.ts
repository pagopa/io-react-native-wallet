import type { IssuanceApi } from "../api";

import { Issuance as V1_4_6 } from "../v1.4.6";
import { authorizeAccess } from "./04-authorize-access";

export const Issuance: IssuanceApi = {
  ...V1_4_6,
  authorizeAccess,
};
