import {
  fetchAndValidateLoTE,
  type LoTEProfile,
  type ParsedLoTE,
  validateWRPAC,
} from "@pagopa/io-wallet-eudi-trust";

import { trustCallbacks } from "./callbacks";

export interface BootstrapLoTEsOptions {
  appFetch?: typeof fetch;
  /** URL of the LoTE of each profile to fetch */
  loteUrls: Partial<Record<LoTEProfile, string>>;
  /** DER certificates, encoded in base64, published in the OJEU */
  trustedCertificates: string[];
}

export interface BootstrapLoTEsResult {
  /** The LoTEs that could not be fetched or validated */
  failures: LoTEFailure[];
  /** The valid LoTEs, by profile */
  lotes: LoTEs;
}

export interface LoTEFailure {
  error: unknown;
  profile: LoTEProfile;
}

export type LoTEs = Partial<Record<LoTEProfile, ParsedLoTE>>;

/**
 * Fetches and validates the LoTEs in parallel.
 * A LoTE that fails does not prevent the others from being loaded.
 */
export const bootstrapLoTEs = async ({
  appFetch = fetch,
  loteUrls,
  trustedCertificates,
}: BootstrapLoTEsOptions): Promise<BootstrapLoTEsResult> => {
  const callbacks = { ...trustCallbacks, fetch: appFetch };
  const entries = Object.entries(loteUrls) as [LoTEProfile, string][];

  const results = await Promise.allSettled(
    entries.map(([profile, loteUrl]) =>
      fetchAndValidateLoTE({
        callbacks,
        loteUrl,
        profile,
        trustedCertificates,
      }),
    ),
  );

  const result: BootstrapLoTEsResult = { failures: [], lotes: {} };

  results.forEach((settled, index) => {
    const [profile] = entries[index] as [LoTEProfile, string];
    if (settled.status === "fulfilled") {
      result.lotes[profile] = settled.value;
    } else {
      result.failures.push({ error: settled.reason as unknown, profile });
    }
  });

  return result;
};

export interface ValidateAndParseWRPACOptions {
  wrpacChain: string[];
  wrpacLote: ParsedLoTE;
}

export const validateAndParseWRPAC = async ({
  wrpacChain,
  wrpacLote,
}: ValidateAndParseWRPACOptions) =>
  validateWRPAC({
    callbacks: trustCallbacks,
    lote: wrpacLote,
    wrpacChain: wrpacChain as [string, ...string[]],
  });
