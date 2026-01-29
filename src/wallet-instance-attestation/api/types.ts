import * as z from "zod";
import { UnixTime } from "../../utils/zod";
import { JWK } from "../../utils/jwk";

/**
 * Common Wallet Attestation shape. This object is
 * an abstraction over the version-specific JWTs.
 */
export type DecodedAttestationJwt = z.infer<typeof DecodedAttestationJwt>;
export const DecodedAttestationJwt = z.object({
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
  cnf: z.object({ jwk: JWK }),
  sub: z.string(),
  wallet_link: z.string().optional(),
  wallet_name: z.string().optional(),
  aal: z.string().optional(),
});

export type WalletAttestation = {
  type: "wallet_app_attestation" | "wallet_unit_attestation"; // Legacy Wallet Attestation == Wallet App Attestation
  format: string;
  attestation: string;
};
