import type { StartFlowApi } from "./01-start-flow";
import type { EvaluateRelyingPartyTrustApi } from "./02-evaluate-rp-trust";
import type { GetRequestObjectApi } from "./03-get-request-object";
import type { RetrieveRpJwksApi } from "./04-retrieve-rp-jwks";
import type { EvaluateDcqlQueryApi } from "./05-evaluate-dcql-query";
import type { SendAuthorizationResponseApi } from "./06-send-authorization-response";
import type { RelyingPartyConfig } from "./RelyingPartyConfig";

export interface RemotePresentationApi
  extends StartFlowApi,
    EvaluateRelyingPartyTrustApi,
    GetRequestObjectApi,
    RetrieveRpJwksApi,
    EvaluateDcqlQueryApi,
    SendAuthorizationResponseApi {}

export type { RelyingPartyConfig };
