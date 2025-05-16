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
  fetchJwksFromRequestObject,
  fetchJwksFromConfig,
  type FetchJwks,
} from "./04-retrieve-rp-jwks";
import {
  verifyRequestObjectSignature,
  type VerifyRequestObjectSignature,
} from "./05-verify-request-object";
import {
  fetchPresentDefinition,
  type FetchPresentationDefinition,
} from "./06-fetch-presentation-definition";
import {
  evaluateInputDescriptors,
  type EvaluateInputDescriptors,
} from "./07-evaluate-input-descriptor";
import {
  evaluateDcqlQuery,
  type EvaluateDcqlQuery,
} from "./07-evaluate-dcql-query";
import {
  prepareRemotePresentations,
  sendAuthorizationResponse,
  type SendAuthorizationResponse,
  sendAuthorizationErrorResponse,
  type SendAuthorizationErrorResponse,
  sendAuthorizationResponseDcql,
  type SendAuthorizationResponseDcql,
} from "./08-send-authorization-response";
import * as Errors from "./errors";
import type { PrepareRemotePresentations } from "./types";

export {
  startFlowFromQR,
  evaluateRelyingPartyTrust,
  getRequestObject,
  fetchJwksFromRequestObject,
  fetchJwksFromConfig,
  verifyRequestObjectSignature,
  fetchPresentDefinition,
  evaluateInputDescriptors,
  evaluateDcqlQuery,
  sendAuthorizationResponse,
  sendAuthorizationErrorResponse,
  sendAuthorizationResponseDcql,
  prepareRemotePresentations,
  Errors,
};
export type {
  StartFlow,
  EvaluateRelyingPartyTrust,
  GetRequestObject,
  FetchJwks,
  VerifyRequestObjectSignature,
  FetchPresentationDefinition,
  EvaluateInputDescriptors,
  PrepareRemotePresentations,
  SendAuthorizationResponse,
  SendAuthorizationResponseDcql,
  SendAuthorizationErrorResponse,
  EvaluateDcqlQuery,
};
