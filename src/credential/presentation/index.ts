import { startFlowFromQR, type StartFlow } from "./01-start-flow";
import {
  evaluateRelyingPartyTrust,
  type EvaluateRelyingPartyTrust,
} from "./02-evaluate-rp-trust";
import {
  fetchJwksFromUri,
  fetchJwksFromConfig,
  type FetchJwks,
} from "./03-retrieve-jwks";
import {
  getRequestObject,
  type GetRequestObject,
} from "./04-get-request-object";
import {
  fetchPresentDefinition,
  type FetchPresentationDefinition,
} from "./05-fetch-presentation-definition";
import {
  sendAuthorizationResponse,
  type SendAuthorizationResponse,
} from "./05-send-authorization-response";
import * as Errors from "./errors";

export {
  startFlowFromQR,
  evaluateRelyingPartyTrust,
  fetchJwksFromUri,
  fetchJwksFromConfig,
  getRequestObject,
  fetchPresentDefinition,
  sendAuthorizationResponse,
  Errors,
};
export type {
  StartFlow,
  EvaluateRelyingPartyTrust,
  FetchJwks,
  GetRequestObject,
  FetchPresentationDefinition,
  SendAuthorizationResponse,
};
