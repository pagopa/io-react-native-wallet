import * as z from "zod";

import { JWK } from "../../utils/jwk";
import { UnixTime } from "../../utils/zod";

/**
 * Common Wallet Instance Attestation shape. This object is
 * an abstraction over the version-specific JWTs.
 */
export type DecodedWalletInstanceAttestation = z.infer<
  typeof DecodedWalletInstanceAttestation
>;
export const DecodedWalletInstanceAttestation = z.object({
  /** @deprecated */
  aal: z.string().optional(),
  cnf: z.object({ jwk: JWK }),
  exp: UnixTime,
  iat: UnixTime,
  iss: z.string(),
  sub: z.string(),
  /** @deprecated */
  wallet_link: z.string().optional(),
  /** @deprecated */
  wallet_name: z.string().optional(),
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
