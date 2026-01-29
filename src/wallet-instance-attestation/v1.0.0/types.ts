import * as z from "zod";
import { Jwt } from "../common/types";

export type WalletInstanceAttestationRequestJwt = z.infer<
  typeof WalletInstanceAttestationRequestJwt
>;
export const WalletInstanceAttestationRequestJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("wp-war+jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      aud: z.string(),
      nonce: z.string(),
      hardware_signature: z.string(),
      integrity_assertion: z.string(),
      hardware_key_tag: z.string(),
    })
  ),
});

// TODO: [SIW-2089] add type for Wallet Attestation in SD-JWT and MDOC format
// See https://italia.github.io/eid-wallet-it-docs/versione-corrente/en/wallet-solution.html#wallet-attestation-issuance step 18
export type WalletInstanceAttestationJwt = z.infer<
  typeof WalletInstanceAttestationJwt
>;
export const WalletInstanceAttestationJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("oauth-client-attestation+jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      sub: z.string(),
      aal: z.string(),
      wallet_link: z.string().optional(),
      wallet_name: z.string().optional(),
    })
  ),
});

export type WalletAttestationResponse = z.infer<
  typeof WalletAttestationResponse
>;
export const WalletAttestationResponse = z.object({
  wallet_attestations: z.array(
    z.object({
      wallet_attestation: z.string(),
      format: z.enum(["jwt", "dc+sd-jwt", "mso_mdoc"]),
    })
  ),
});
