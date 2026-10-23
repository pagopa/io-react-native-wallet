import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import {
  EUDI_LOTE_URLS,
  EUDI_NEGATIVE_LOTE_URLS,
  EUDI_TRUSTED_CERTIFICATES,
} from "../../utils/eudiTrust";
import { createAppAsyncThunk } from "../utils";

/**
 * Thunk to fetch and validate a single EUDI List of Trusted Entities (LoTE),
 * replacing the one of the same profile.
 * @param params.profile - The profile of the LoTE to fetch
 * @param params.isNegative - Whether to fetch the LoTE for negative tests instead of the default one
 * @returns The validated LoTE
 */
export const fetchLoTEThunk = createAppAsyncThunk(
  "eudi/loteFetch",
  async ({
    isNegative,
    profile,
  }: {
    isNegative: boolean;
    profile: Eudi.Trust.LoTEProfile;
  }) => {
    const loteUrls = isNegative ? EUDI_NEGATIVE_LOTE_URLS : EUDI_LOTE_URLS;
    const { failures, lotes } = await Eudi.Trust.bootstrapLoTEs({
      loteUrls: { [profile]: loteUrls[profile] },
      trustedCertificates: EUDI_TRUSTED_CERTIFICATES.map((c) => c.x509),
    });

    const lote = lotes[profile];
    if (!lote) {
      throw failures[0]?.error ?? new Error(`The ${profile} LoTE is missing`);
    }
    return lote;
  },
);
