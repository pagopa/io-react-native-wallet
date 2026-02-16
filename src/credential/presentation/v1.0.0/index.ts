import type { RemotePresentationApi } from "../api";
import { startFlowFromQR } from "./01-start-flow";
import { evaluateRelyingPartyTrust } from "./02-evaluate-rp-trust";
import { getRequestObject } from "./03-get-request-object";
import { verifyRequestObject } from "./04-verify-request-object";
import { evaluateDcqlQuery } from "./05-evaluate-dcql-query";
import {
  prepareRemotePresentations,
  sendAuthorizationResponse,
  sendAuthorizationErrorResponse,
} from "./06-send-authorization-response";

export const RemotePresentation: RemotePresentationApi = {
  startFlowFromQR,
  evaluateRelyingPartyTrust,
  getRequestObject,
  verifyRequestObject,
  evaluateDcqlQuery,
  prepareRemotePresentations,
  sendAuthorizationResponse,
  sendAuthorizationErrorResponse,
};
