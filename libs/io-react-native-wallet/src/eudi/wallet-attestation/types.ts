import * as z from "zod";

import { JWK } from "../../utils/jwk";
import { UnixTime } from "../../utils/zod";

/**
 * Parameters of the Wallet Provider, the same of the IT-Wallet v1.4.6 Wallet Instance and Key Attestation requests.
 */
export interface WalletAttestationRequestParams {
  walletProviderBaseUrl: string;
  walletSolutionId: string;
  walletSolutionVersion: string;
}

export type WalletAttestationResponse = z.infer<
  typeof WalletAttestationResponse
>;
export const WalletAttestationResponse = z.object({
  wallet_instance_attestation: z.string(),
});

export type KeyAttestationResponse = z.infer<typeof KeyAttestationResponse>;
export const KeyAttestationResponse = z.object({
  key_attestation: z.string(),
});

/**
 * Wallet Attestation as defined by OAuth 2.0 Attestation-Based Client Authentication,
 * signed by the Wallet Provider with an X.509 certificate chain.
 */
export type WalletAttestationJwt = z.infer<typeof WalletAttestationJwt>;
export const WalletAttestationJwt = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string().optional(),
    typ: z.literal("oauth-client-attestation+jwt"),
    x5c: z.array(z.string()),
  }),
  payload: z.object({
    cnf: z.object({ jwk: JWK }),
    exp: UnixTime,
    iat: UnixTime,
    iss: z.string(),
    sub: z.string(),
    wallet_link: z.string().optional(),
    wallet_name: z.string().optional(),
  }),
});
