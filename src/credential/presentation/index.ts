import { startFlowFromQR, type StartFlow } from "./01-start-flow";
import {
  evaluateRelyingPartyTrust,
  type EvaluateRelyingPartyTrust,
} from "./02-evaluate-rp-trust";
import {
  getRequestObject,
  type GetRequestObject,
} from "./03-get-request-object";
import { getJwksFromConfig, type FetchJwks } from "./04-retrieve-rp-jwks";
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
  prepareRemotePresentations,
  type EvaluateInputDescriptors,
  type PrepareRemotePresentations,
} from "./07-evaluate-input-descriptor";
import {
  sendAuthorizationResponse,
  type SendAuthorizationResponse,
} from "./08-send-authorization-response";
import * as Errors from "./errors";

export {
  startFlowFromQR,
  evaluateRelyingPartyTrust,
  getRequestObject,
  getJwksFromConfig,
  verifyRequestObject,
  fetchPresentDefinition,
  evaluateInputDescriptors,
  prepareRemotePresentations,
  sendAuthorizationResponse,
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
  PrepareRemotePresentations,
  SendAuthorizationResponse,
};
