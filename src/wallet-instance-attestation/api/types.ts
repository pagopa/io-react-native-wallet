import * as z from "zod";
import { UnixTime } from "../../utils/zod";
import { JWK } from "../../utils/jwk";

/**
 * Common Wallet Instance Attestation shape. This object is
 * an abstraction over the version-specific JWTs.
 */
export type DecodedWalletInstanceAttestation = z.infer<
  typeof DecodedWalletInstanceAttestation
>;
export const DecodedWalletInstanceAttestation = z.object({
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
  cnf: z.object({ jwk: JWK }),
  sub: z.string(),
  /** @deprecated */
  wallet_link: z.string().optional(),
  /** @deprecated */
  wallet_name: z.string().optional(),
  /** @deprecated */
  aal: z.string().optional(),
});

export type WalletAttestation = {
  format: string;
  attestation: string;
};

export type WalletAttestationRequestParams = {
  walletProviderBaseUrl: string;
  walletSolutionId: string;
  walletSolutionVersion: string;
};
