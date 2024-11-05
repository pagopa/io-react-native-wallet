import { type StartFlow } from "./01-start-flow";
import {
  evaluateIssuerTrust,
  type EvaluateIssuerTrust,
} from "./02-evaluate-issuer-trust";
import {
  startUserAuthorization,
  type StartUserAuthorization,
} from "./03-start-user-authorization";
import {
  completeUserAuthorizationWithQueryMode,
  completeUserAuthorizationWithFormPostJwtMode,
  parseAuthroizationResponse,
  type CompleteUserAuthorizationWithQueryMode,
  type CompleteUserAuthorizationWithFormPostJwtMode,
  type GetRequestedCredentialToBePresented,
  getRequestedCredentialToBePresented,
} from "./04-complete-user-authorization";
import { authorizeAccess, type AuthorizeAccess } from "./05-authorize-access";
import {
  obtainCredential,
  type ObtainCredential,
} from "./06-obtain-credential";
import {
  verifyAndParseCredential,
  type VerifyAndParseCredential,
} from "./07-verify-and-parse-credential";

export {
  evaluateIssuerTrust,
  startUserAuthorization,
  completeUserAuthorizationWithQueryMode,
  getRequestedCredentialToBePresented,
  completeUserAuthorizationWithFormPostJwtMode,
  authorizeAccess,
  obtainCredential,
  verifyAndParseCredential,
  parseAuthroizationResponse,
};
export type {
  StartFlow,
  EvaluateIssuerTrust,
  StartUserAuthorization,
  CompleteUserAuthorizationWithQueryMode,
  GetRequestedCredentialToBePresented,
  CompleteUserAuthorizationWithFormPostJwtMode,
  AuthorizeAccess,
  ObtainCredential,
  VerifyAndParseCredential,
};
export * as Errors from "./errors";
