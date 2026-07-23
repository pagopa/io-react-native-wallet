import type { IssuanceApi } from "../api";

import { MRTDPoPv1_3 } from "../mrtd-pop";
import { evaluateIssuerTrust } from "./01-evaluate-issuer-trust";
import { startUserAuthorization } from "./02-start-user-authorization";
import {
  buildAuthorizationUrl,
  completeEaaUserAuthorizationWithQueryMode,
  completePidUserAuthorizationWithQueryMode,
  completeUserAuthorizationWithFormPostJwtMode,
  continueUserAuthorizationWithMRTDPoPChallenge,
  getRequestedCredentialToBePresented,
} from "./03-complete-user-authorization";
import { authorizeAccess } from "./04-authorize-access";
import {
  obtainCredential,
  obtainCredentialsBatch,
} from "./05-obtain-credential";
import { verifyAndParseCredential } from "./06-verify-and-parse-credential";

export const Issuance: IssuanceApi = {
  authorizeAccess,
  buildAuthorizationUrl,
  completeEaaUserAuthorizationWithQueryMode,
  completePidUserAuthorizationWithQueryMode,
  completeUserAuthorizationWithFormPostJwtMode,
  continueUserAuthorizationWithMRTDPoPChallenge,
  evaluateIssuerTrust,
  getRequestedCredentialToBePresented,
  MRTDPoP: MRTDPoPv1_3,
  obtainCredential,
  obtainCredentialsBatch,
  startUserAuthorization,
  verifyAndParseCredential,
};
