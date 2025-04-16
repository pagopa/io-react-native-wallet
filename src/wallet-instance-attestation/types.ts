import { JWK } from "../utils/jwk";
import * as z from "zod";

const UnixTime = z.number().min(0).max(2147483647000);
type UnixTime = z.infer<typeof UnixTime>;

const Jwt = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string(),
    typ: z.string(),
    x5c: z.array(z.string()).optional(),
    trust_chain: z.array(z.string()).optional(),
  }),
  payload: z.object({
    iss: z.string(),
    iat: UnixTime,
    exp: UnixTime,
    cnf: z.object({
      jwk: z.intersection(
        JWK,
        // this key requires a kis because it must be referenced for DPoP
        z.object({ kid: z.string() })
      ),
    }),
  }),
});

export type WalletInstanceAttestationRequestJwt = z.infer<
  typeof WalletInstanceAttestationRequestJwt
>;
export const WalletInstanceAttestationRequestJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("war+jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      aud: z.string(),
      jti: z.string(),
      nonce: z.string(),
    })
  ),
});

// TODO: add type for Wallet Attestation in SD-JWT and MDOC format
// See https://italia.github.io/eid-wallet-it-docs/versione-corrente/en/wallet-solution.html#wallet-attestation-issuance step 18
export type WalletInstanceAttestationJwt = z.infer<
  typeof WalletInstanceAttestationJwt
>;
export const WalletInstanceAttestationJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      sub: z.string(),
      aal: z.string(),
      vct: z.string(),
      wallet_name: z.string(),
      wallet_link: z.string(),
    })
  ),
});

export type TokenResponse = z.infer<typeof TokenResponse>;
export const TokenResponse = z.object({
  wallet_attestations: z.array(
    z.object({
      format: z.enum(["jwt", "dc+sd-jwt", "mso_mdoc"]),
      wallet_attestation: z.string(),
    })
  ),
});
