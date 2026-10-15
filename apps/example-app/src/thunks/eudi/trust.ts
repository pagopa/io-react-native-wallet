import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { EUDI_TRUSTED_CERTIFICATES } from "../../utils/eudiTrust";
import { createAppAsyncThunk } from "../utils";

const { LoTEProfile } = Eudi.Trust;

const loteUrls = {
  [LoTEProfile.EUPIDProvidersList]:
    "https://development.trust.tech.ec.europa.eu/lists/eudiw/pid-providers.json",
  [LoTEProfile.EUWalletProvidersList]:
    "https://development.trust.tech.ec.europa.eu/lists/eudiw/wallet-providers.json",
  [LoTEProfile.EUWRPACProvidersList]:
    "https://development.trust.tech.ec.europa.eu/lists/eudiw/wrpac-providers.json",
  [LoTEProfile.EUWRPRCProvidersList]:
    "https://development.trust.tech.ec.europa.eu/lists/eudiw/wrprc-providers.json",
  [LoTEProfile.mDLProvidersList]:
    "https://development.trust.tech.ec.europa.eu/lists/eudiw/mdl-providers.json",
};

/**
 * Thunk to fetch and validate the EUDI Lists of Trusted Entities (LoTE) and keep them in memory.
 * A LoTE that fails does not prevent the others from being loaded: the failures are returned.
 */
export const bootstrapLoTEsThunk = createAppAsyncThunk(
  "eudi/lotesBootstrap",
  async () => {
    const { failures, lotes } = await Eudi.Trust.bootstrapLoTEs({
      loteUrls,
      trustedCertificates: EUDI_TRUSTED_CERTIFICATES.map(c => c.x509),
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
