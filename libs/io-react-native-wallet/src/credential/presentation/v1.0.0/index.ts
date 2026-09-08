import type { RemotePresentationApi } from "../api";

import { startFlowFromQR } from "./01-start-flow";
import { evaluateRelyingPartyTrust } from "./02-evaluate-rp-trust";
import { getRequestObject } from "./03-get-request-object";
import { verifyRequestObject } from "./05-verify-request-object";
import { evaluateDcqlQuery } from "./06-evaluate-dcql-query";
import {
  prepareRemotePresentations,
  sendAuthorizationErrorResponse,
  sendAuthorizationResponse,
} from "./07-send-authorization-response";

export const RemotePresentation: RemotePresentationApi = {
  evaluateDcqlQuery,
  evaluateRelyingPartyTrust,
  getRequestObject,
  prepareRemotePresentations,
  sendAuthorizationErrorResponse,
  sendAuthorizationResponse,
  startFlowFromQR,
  verifyRequestObject,
};
