import type { IssuanceApi } from "../api";
import { evaluateIssuerTrust } from "./01-evaluate-issuer-trust";
import { startUserAuthorization } from "./02-start-user-authorization";
import {
  continueUserAuthorizationWithMRTDPoPChallenge,
  completeUserAuthorizationWithQueryMode,
  completeUserAuthorizationWithFormPostJwtMode,
  buildAuthorizationUrl,
  getRequestedCredentialToBePresented,
} from "./03-complete-user-authorization";
import { authorizeAccess } from "./04-authorize-access";
import { obtainCredential } from "./05-obtain-credential";
import { verifyAndParseCredential } from "./06-verify-and-parse-credential";
import { MRTDPoP } from "../mrtd-pop";

export const Issuance: IssuanceApi = {
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
  MRTDPoP,
};
