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
  fetchPresentDefinition,
  type FetchPresentationDefinition,
} from "./06-fetch-presentation-definition";
import {
  evaluateInputDescriptors,
  prepareLegacyRemotePresentations,
  type EvaluateInputDescriptors,
  type PrepareLegacyRemotePresentations,
} from "./07-evaluate-input-descriptor";
import {
  evaluateDcqlQuery,
  type EvaluateDcqlQuery,
  type PrepareRemotePresentations,
} from "./07-evaluate-dcql-query";
import {
  prepareRemotePresentations,
  sendAuthorizationResponseDcql,
  type SendAuthorizationResponseDcql,
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
  fetchPresentDefinition,
  evaluateInputDescriptors,
  evaluateDcqlQuery,
  prepareLegacyRemotePresentations,
  prepareRemotePresentations,
  sendAuthorizationResponseDcql,
  sendAuthorizationErrorResponse,
  Errors,
};
export type {
  StartFlow,
  EvaluateRelyingPartyTrust,
  GetRequestObject,
  FetchJwks,
  VerifyRequestObject,
  FetchPresentationDefinition,
  EvaluateInputDescriptors,
  EvaluateDcqlQuery,
  PrepareLegacyRemotePresentations,
  PrepareRemotePresentations,
  SendAuthorizationResponseDcql,
  SendAuthorizationErrorResponse,
};
