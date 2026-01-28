import { type EvaluateIssuerTrustApi } from "./01-evaluate-issuer-trust";
import { type StartUserAuthorizationApi } from "./02-start-user-authorization";
import { type CompleteUserAuthorizationApi } from "./03-complete-user-authorization";
import { type AuthorizeAccessApi } from "./04-authorize-access";
import { type ObtainCredentialApi } from "./05-obtain-credential";
import { type VerifyAndParseCredentialApi } from "./06-verify-and-parse-credential";

export interface IssuanceApi
  extends EvaluateIssuerTrustApi,
    StartUserAuthorizationApi,
    CompleteUserAuthorizationApi,
    AuthorizeAccessApi,
    ObtainCredentialApi,
    VerifyAndParseCredentialApi {}
