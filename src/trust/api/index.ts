import type { TrustBuildApi } from "./build";
import type { TrustVerifyApi } from "./verify";

export interface TrustApi extends TrustBuildApi, TrustVerifyApi {}
