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
  parseAuthorizationResponse,
  buildAuthorizationUrl,
  type CompleteUserAuthorizationWithQueryMode,
  type CompleteUserAuthorizationWithFormPostJwtMode,
  type GetRequestedCredentialToBePresented,
  type BuildAuthorizationUrl,
  getRequestedCredentialToBePresented,
  completeUserAuthorizationWithDocumentProof,
  type CompleteUserAuthorizationWithDocumentProof,
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
import * as Errors from "./errors";

export {
  evaluateIssuerTrust,
  startUserAuthorization,
  buildAuthorizationUrl,
  completeUserAuthorizationWithQueryMode,
  getRequestedCredentialToBePresented,
  completeUserAuthorizationWithFormPostJwtMode,
  authorizeAccess,
  obtainCredential,
  verifyAndParseCredential,
  parseAuthorizationResponse,
  completeUserAuthorizationWithDocumentProof,
  Errors,
};
export type {
  StartFlow,
  EvaluateIssuerTrust,
  StartUserAuthorization,
  BuildAuthorizationUrl,
  CompleteUserAuthorizationWithQueryMode,
  GetRequestedCredentialToBePresented,
  CompleteUserAuthorizationWithFormPostJwtMode,
  AuthorizeAccess,
  ObtainCredential,
  VerifyAndParseCredential,
  CompleteUserAuthorizationWithDocumentProof,
};
