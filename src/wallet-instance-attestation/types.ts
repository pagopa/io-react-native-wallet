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
      typ: z.literal("wiar+jwt"),
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

export type WalletInstanceAttestationJwt = z.infer<
  typeof WalletInstanceAttestationJwt
>;
export const WalletInstanceAttestationJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("wallet-attestation+jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      sub: z.string(),
      attested_security_context: z.string(),
      authorization_endpoint: z.string(),
      response_types_supported: z.array(z.string()),
      vp_formats_supported: z.object({
        jwt_vp_json: z.object({
          alg_values_supported: z.array(z.string()),
        }),
        jwt_vc_json: z.object({
          alg_values_supported: z.array(z.string()),
        }),
      }),
      request_object_signing_alg_values_supported: z.array(z.string()),
      presentation_definition_uri_supported: z.boolean(),
    })
  ),
});
