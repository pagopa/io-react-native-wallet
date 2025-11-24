import { startFlowFromQR, type StartFlow } from "./01-start-flow";
import {
  evaluateRelyingPartyTrust,
  type EvaluateRelyingPartyTrust,
} from "./02-evaluate-rp-trust";
import {
  getRequestObject,
  type GetRequestObject,
} from "./03-get-request-object";
import {
  getJwksFromConfig,
  fetchJwksFromRequestObject,
  type FetchJwks,
} from "./04-retrieve-rp-jwks";
import {
  verifyRequestObject,
  type VerifyRequestObject,
} from "./05-verify-request-object";
import {
  evaluateDcqlQuery,
  type EvaluateDcqlQuery,
} from "./07-evaluate-dcql-query";
import {
  type PrepareRemotePresentations,
  prepareRemotePresentations,
  sendAuthorizationResponse,
  type SendAuthorizationResponse,
  sendAuthorizationErrorResponse,
  type SendAuthorizationErrorResponse,
} from "./08-send-authorization-response";
import * as Errors from "./errors";

export {
  startFlowFromQR,
  evaluateRelyingPartyTrust,
  getRequestObject,
  getJwksFromConfig,
  fetchJwksFromRequestObject,
  verifyRequestObject,
  evaluateDcqlQuery,
  prepareRemotePresentations,
  sendAuthorizationResponse,
  sendAuthorizationErrorResponse,
  Errors,
};
export type {
  StartFlow,
  EvaluateRelyingPartyTrust,
  GetRequestObject,
  FetchJwks,
  VerifyRequestObject,
  EvaluateDcqlQuery,
  PrepareRemotePresentations,
  SendAuthorizationResponse,
  SendAuthorizationErrorResponse,
};
