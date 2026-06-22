import type { StartFlowApi } from "./01-start-flow";
import type { EvaluateRelyingPartyTrustApi } from "./02-evaluate-rp-trust";
import type { GetRequestObjectApi } from "./03-get-request-object";
import type { VerifyAuthRequestCertificateChainApi } from "./04-verify-certificate-chain";
import type { VerifyRequestObjectApi } from "./05-verify-request-object";
import type { EvaluateDcqlQueryApi } from "./06-evaluate-dcql-query";
import type { SendAuthorizationResponseApi } from "./07-send-authorization-response";
import type { RelyingPartyConfig } from "./RelyingPartyConfig";

export interface RemotePresentationApi
  extends StartFlowApi,
    EvaluateRelyingPartyTrustApi,
    GetRequestObjectApi,
    VerifyAuthRequestCertificateChainApi,
    VerifyRequestObjectApi,
    EvaluateDcqlQueryApi,
    SendAuthorizationResponseApi {}

export type { RelyingPartyConfig };
export * from "./types";
