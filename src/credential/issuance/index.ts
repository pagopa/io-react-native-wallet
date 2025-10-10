import { type StartFlow } from "./01-start-flow";
import { getIssuerConfig, type GetIssuerConfig } from "./02-get-issuer-config";
import {
  startUserAuthorization,
  type StartUserAuthorization,
} from "./03-start-user-authorization";
import {
  completeUserAuthorizationWithQueryMode,
  parseAuthorizationResponse,
  buildAuthorizationUrl,
  type CompleteUserAuthorizationWithQueryMode,
  type BuildAuthorizationUrl,
} from "./04-complete-user-authorization";
import { authorizeAccess, type AuthorizeAccess } from "./05-authorize-access";
import {
  obtainCredential,
  type ObtainCredential,
  type ContextWithKeyTag,
  type CryptoContextFactory,
} from "./06-obtain-credential";
import {
  verifyAndParseCredential,
  type VerifyAndParseCredential,
} from "./07-verify-and-parse-credential";
import * as Errors from "./errors";

export {
  getIssuerConfig,
  startUserAuthorization,
  buildAuthorizationUrl,
  completeUserAuthorizationWithQueryMode,
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
  AuthorizeAccess,
  ObtainCredential,
  VerifyAndParseCredential,
  CryptoContextFactory,
  ContextWithKeyTag
};
