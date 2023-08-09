import { JWK } from "../utils/jwk";
import { z } from "zod";

export type PidDisplayMetadata = z.infer<typeof PidDisplayMetadata>;
export const PidDisplayMetadata = z.object({
  name: z.string(),
  locale: z.string(),
  logo: z.object({
    url: z.string(),
    alt_text: z.string(),
  }),
  background_color: z.string(),
  text_color: z.string(),
});

export type PidIssuerMetadata = z.infer<typeof PidIssuerMetadata>;
export const PidIssuerMetadata = z.object({
  jwks: z.object({ keys: z.array(JWK) }),
  metadata: z.object({
    openid_credential_issuer: z.object({
      credential_issuer: z.string(),
      authorization_endpoint: z.string(),
      token_endpoint: z.string(),
      pushed_authorization_request_endpoint: z.string(),
      dpop_signing_alg_values_supported: z.array(z.string()),
      credential_endpoint: z.string(),
      credentials_supported: z.object({
        "eu.eudiw.pid.it": z.object({
          format: z.literal("vc+sd-jwt"),
          cryptographic_binding_methods_supported: z.array(z.string()),
          cryptographic_suites_supported: z.array(z.string()),
          display: z.array(PidDisplayMetadata),
        }),
      }),
    }),
    federation_entity: z.object({
      organization_name: z.string(),
      homepage_uri: z.string(),
      policy_uri: z.string(),
      tos_uri: z.string(),
      logo_uri: z.string(),
    }),
  }),
});
