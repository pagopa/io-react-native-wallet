import * as Errors from "../../credential/presentation/common/errors";

export {
  type ResolvedRequestObject,
  resolveRequestObject,
} from "./01-resolve-request-object";
export {
  type VerifiedRequestObject,
  verifyRequestObject,
  type VerifyRequestObjectParams,
} from "./02-verify-request-object";
export { evaluateVerifierTrust } from "./03-evaluate-verifier-trust";
export {
  evaluateDcqlQuery,
  type EvaluatedCredential,
  type EvaluatedCredentialQuery,
  type WalletCredential,
} from "./04-evaluate-dcql-query";
export {
  sendAuthorizationErrorResponse,
  sendAuthorizationResponse,
} from "./05-send-authorization-response";
export type {
  AuthorizationErrorCode,
  AuthorizationResponseResult,
  ClientMetadata,
  RequestObject,
} from "./types";
export { Errors };
