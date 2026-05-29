import type { IssuanceApi } from "../api";
import { evaluateIssuerTrust } from "./01-evaluate-issuer-trust";
import { startUserAuthorization } from "./02-start-user-authorization";
import {
  continueUserAuthorizationWithMRTDPoPChallenge,
  completePidUserAuthorizationWithQueryMode,
  completeEaaUserAuthorizationWithQueryMode,
  completeUserAuthorizationWithFormPostJwtMode,
  buildAuthorizationUrl,
  getRequestedCredentialToBePresented,
} from "./03-complete-user-authorization";
import { authorizeAccess } from "./04-authorize-access";
import {
  obtainCredential,
  obtainCredentialsBatch,
} from "./05-obtain-credential";
import { verifyAndParseCredential } from "./06-verify-and-parse-credential";
import { MRTDPoPv1_0 } from "../mrtd-pop";

export const Issuance: IssuanceApi = {
  evaluateIssuerTrust,
  startUserAuthorization,
  buildAuthorizationUrl,
  completePidUserAuthorizationWithQueryMode,
  completeEaaUserAuthorizationWithQueryMode,
  continueUserAuthorizationWithMRTDPoPChallenge,
  getRequestedCredentialToBePresented,
  completeUserAuthorizationWithFormPostJwtMode,
  authorizeAccess,
  obtainCredential,
  obtainCredentialsBatch,
  verifyAndParseCredential,
  MRTDPoP: MRTDPoPv1_0,
};
