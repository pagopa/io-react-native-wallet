import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import { decode } from "@pagopa/io-react-native-jwt";

import { selectEudiLoteByProfile } from "../../store/reducers/eudi/trust";
import {
  EUDI_LOTE_URLS,
  EUDI_TRUSTED_CERTIFICATES,
} from "../../utils/eudiTrust";
import { createAppAsyncThunk } from "../utils";

const { LoTEProfile } = Eudi.Trust;

/**
 * Thunk to fetch and validate the EUDI Lists of Trusted Entities (LoTE) and keep them in memory.
 * A LoTE that fails does not prevent the others from being loaded: the failures are returned.
 */
export const bootstrapLoTEsThunk = createAppAsyncThunk(
  "eudi/lotesBootstrap",
  async () => {
    const { failures, lotes } = await Eudi.Trust.bootstrapLoTEs({
      loteUrls: EUDI_LOTE_URLS,
      trustedCertificates: EUDI_TRUSTED_CERTIFICATES.map((c) => c.x509),
    });

    return {
      failures: failures.map(({ error, profile }) => ({
        message: error instanceof Error ? error.message : String(error),
        profile,
      })),
      lotes,
      total: Object.keys(EUDI_LOTE_URLS).length,
    };
  },
);

/**
 * Thunk to fetch the EUDIW Dev Issuer metadata and validate its WRPAC against the WRPAC LoTe.
 * If no WRPAC LoTE is found, the thunk attempts to bootstrap all LoTEs and continue.
 * Note that this is only a test thunk and it is not meant to be used in real issuance flows.
 */
export const validateCredentialIssuerMetadataWRPACThunk = createAppAsyncThunk(
  "eudi/validateAndParseWRPAC",
  async (_, state) => {
    const existingWrpacLote = selectEudiLoteByProfile(
      LoTEProfile.EUWRPACProvidersList,
    )(state.getState());
    if (!existingWrpacLote) {
      await state.dispatch(bootstrapLoTEsThunk()).unwrap();
    }

    const wrpacLote = selectEudiLoteByProfile(LoTEProfile.EUWRPACProvidersList)(
      state.getState(),
    );
    if (!wrpacLote) {
      throw new Error("WRPAC LoTE is missing and could not be bootstrapped");
    }

    const issuerMetadataJwt = await fetch(
      "https://issuer.eudiw.dev/.well-known/openid-credential-issuer",
      { headers: { accept: "application/jwt" } },
    ).then((res) => res.text());

    // The WRPAC is embedded in the Issuer metadata `x5c`
    const wrpacChain = decode(issuerMetadataJwt).protectedHeader.x5c;

    if (!wrpacChain) {
      throw new Error("No WRPAC found in the Issuer metadata JWT");
    }

    // TODO: issuerOrganizationIdentifier is undefined. Is it actually missing from the WRPAC or it's a bug?
    const { wrpac } = await Eudi.Trust.validateAndParseWRPAC({
      wrpacChain,
      wrpacLote,
    });

    // The WRPAC may contain dates, which are not serializable in the store
    // TODO: fix me!
    return JSON.parse(JSON.stringify(wrpac)) as Record<string, unknown>;
  },
);
