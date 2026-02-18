import { UnimplementedFeatureError } from "../../../utils/errors";
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
  obtainCredential: () => {
    throw new UnimplementedFeatureError("obtainCredential", "1.3.3");
  },
  verifyAndParseCredential: () => {
    throw new UnimplementedFeatureError("verifyAndParseCredential", "1.3.3");
  },
  MRTDPoP,
};
