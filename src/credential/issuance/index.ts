import { type StartFlow } from "./01-start-flow";
import {
  getIssuerConfig,
  getIssuerConfigOIDFED,
  type GetIssuerConfig,
} from "./02-get-issuer-config";
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
  getIssuerConfig,
  getIssuerConfigOIDFED,
  startUserAuthorization,
  buildAuthorizationUrl,
  completeUserAuthorizationWithQueryMode,
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
  GetIssuerConfig,
  StartUserAuthorization,
  BuildAuthorizationUrl,
  CompleteUserAuthorizationWithQueryMode,
  GetRequestedCredentialToBePresented,
  CompleteUserAuthorizationWithFormPostJwtMode,
  AuthorizeAccess,
  ObtainCredential,
  VerifyAndParseCredential,
};
