import type { StartFlowApi } from "./01-start-flow";
import type { EvaluateRelyingPartyTrustApi } from "./02-evaluate-rp-trust";
import type { GetRequestObjectApi } from "./03-get-request-object";
import type { EvaluateDcqlQueryApi } from "./04-evaluate-dcql-query";
import type { SendAuthorizationResponseApi } from "./05-send-authorization-response";
import type { RelyingPartyConfig } from "./RelyingPartyConfig";

export interface RemotePresentationApi
  extends StartFlowApi,
    EvaluateRelyingPartyTrustApi,
    GetRequestObjectApi,
    EvaluateDcqlQueryApi,
    SendAuthorizationResponseApi {}

export type { RelyingPartyConfig };
