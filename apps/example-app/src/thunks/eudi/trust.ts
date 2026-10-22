import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import {
  EUDI_LOTE_URLS,
  EUDI_NEGATIVE_LOTE_URLS,
  EUDI_TRUSTED_CERTIFICATES,
} from "../../utils/eudiTrust";
import { createAppAsyncThunk } from "../utils";

/**
 * Thunk to fetch and validate EUDI Lists of Trusted Entities (LoTE), replacing the ones of the previous bootstrap.
 * A LoTE that fails does not prevent the others from being loaded: the failures are returned.
 * @param isNegative - Whether to bootstrap the LoTEs for negative tests instead of the default ones
 */
export const bootstrapLoTEsThunk = createAppAsyncThunk(
  "eudi/lotesBootstrap",
  async (isNegative: boolean) => {
    const loteUrls = isNegative ? EUDI_NEGATIVE_LOTE_URLS : EUDI_LOTE_URLS;
    const { failures, lotes } = await Eudi.Trust.bootstrapLoTEs({
      loteUrls,
      trustedCertificates: EUDI_TRUSTED_CERTIFICATES.map((c) => c.x509),
    });

    return {
      failures: failures.map(({ error, profile }) => ({
        message: error instanceof Error ? error.message : String(error),
        profile,
      })),
      lotes,
      total: Object.keys(loteUrls).length,
    };
  },
);
