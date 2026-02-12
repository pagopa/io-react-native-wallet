import type { IssuanceApi } from "../api";
import { evaluateIssuerTrust } from "./01-evaluate-issuer-trust";
import { startUserAuthorization } from "./02-start-user-authorization";;

export const Issuance: IssuanceApi = {
  evaluateIssuerTrust,
  startUserAuthorization,
};
