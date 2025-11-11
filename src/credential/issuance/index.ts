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
  continueUserAuthorizationWithMRTDPoPChallenge,
  completeUserAuthorizationWithQueryMode,
  completeUserAuthorizationWithFormPostJwtMode,
  parseAuthorizationResponse,
  buildAuthorizationUrl,
  getRequestedCredentialToBePresented,
  type ContinueUserAuthorizationWithMRTDPoPChallenge,
  type CompleteUserAuthorizationWithQueryMode,
  type CompleteUserAuthorizationWithFormPostJwtMode,
  type GetRequestedCredentialToBePresented,
  type BuildAuthorizationUrl,
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
  continueUserAuthorizationWithMRTDPoPChallenge,
  getRequestedCredentialToBePresented,
  completeUserAuthorizationWithFormPostJwtMode,
  authorizeAccess,
  obtainCredential,
  verifyAndParseCredential,
  parseAuthorizationResponse,
  Errors,
};
export type {
  StartFlow,
  EvaluateIssuerTrust,
  StartUserAuthorization,
  BuildAuthorizationUrl,
  ContinueUserAuthorizationWithMRTDPoPChallenge,
  CompleteUserAuthorizationWithQueryMode,
  GetRequestedCredentialToBePresented,
  CompleteUserAuthorizationWithFormPostJwtMode,
  AuthorizeAccess,
  ObtainCredential,
  VerifyAndParseCredential,
};
