import type { TrustmarkApi } from "../api";

import { getCredentialTrustmark } from "./get-credential-trustmark";

export const Trustmark: TrustmarkApi = {
  getCredentialTrustmark,
};
