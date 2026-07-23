import * as z from "zod";

import { JWK } from "../../utils/jwk";
import { UnixTime } from "../../utils/zod";

const Status = z.object({
  status_list: z.object({
    idx: z.number(),
    uri: z.string(),
  }),
});

/**
 * Common Key Attestation shape. This object is
 * an abstraction over the version-specific JWTs.
 */
export type DecodedKeyAttestation = z.infer<
  typeof DecodedKeyAttestation
>;
export const DecodedKeyAttestation = z.object({
  attested_keys: z.array(JWK),
  exp: UnixTime,
  iat: UnixTime,
  iss: z.string(),
  key_storage: z.array(z.string()),
  status: Status,
  user_authentication: z.array(z.string()),
});

export interface WalletAttestation {
  attestation: string;
  format: string;
}

export interface WalletAttestationRequestParams {
  walletProviderBaseUrl: string;
  walletSolutionId: string;
  walletSolutionVersion: string;
}
