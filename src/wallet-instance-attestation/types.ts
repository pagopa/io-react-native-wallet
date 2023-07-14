import * as z from "zod";

const UnixTime = z.number().min(0).max(2147483647000);
type UnixTime = z.infer<typeof UnixTime>;

const Jwt = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string(),
    typ: z.string(),
    x5c: z.array(z.string()),
    trust_chain: z.array(z.string()),
  }),
  payload: z.object({
    iss: z.string(),
    sub: z.string(),
    iat: UnixTime,
    exp: UnixTime,
    cnf: z.object({
      jwk: z.object({
        crv: z.string(),
        kty: z.union([z.literal("RSA"), z.literal("EC")]),
        x: z.string(),
        y: z.string(),
        kid: z.string(),
      }),
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
      typ: z.literal("var+jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      jti: z.string(),
      type: z.literal("WalletInstanceAttestationRequest"),
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
      typ: z.literal("va+jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      type: z.literal("WalletInstanceAttestation"),
      policy_uri: z.string().url(),
      tos_uri: z.string().url(),
      logo_uri: z.string().url(),
      asc: z.string(),
      authorization_endpoint: z.string().url(),
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
