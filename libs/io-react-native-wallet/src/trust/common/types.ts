import * as z from "zod";

import { JWK } from "../../utils/jwk";
import { UnixTime } from "../../utils/zod";

export const TrustMark = z.object({ id: z.string(), trust_mark: z.string() });
export type EntityStatement = z.infer<typeof EntityStatement>;

export type TrustMark = z.infer<typeof TrustMark>;
export const EntityStatement = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string(),
    typ: z.literal("entity-statement+jwt"),
  }),
  payload: z.object({
    exp: z.number(),
    iat: z.number(),
    iss: z.string(),
    jwks: z.object({ keys: z.array(JWK) }),
    sub: z.string(),
    trust_marks: z.array(TrustMark).optional(),
  }),
});

export type EntityConfigurationHeader = z.infer<
  typeof EntityConfigurationHeader
>;
export const EntityConfigurationHeader = z.object({
  alg: z.string(),
  kid: z.string(),
  typ: z.literal("entity-statement+jwt"),
});

/**
 * @see https://openid.net/specs/openid-federation-1_0-46.html
 */
export const FederationEntityMetadata = z
  .object({
    contacts: z.array(z.string()).optional(),
    endpoint_auth_signing_alg_values_supported: z.string().optional(),
    federation_fetch_endpoint: z.string().optional(),
    federation_historical_keys_endpoint: z.string().optional(),
    federation_list_endpoint: z.string().optional(),
    federation_resolve_endpoint: z.string().optional(),
    federation_trust_mark_endpoint: z.string().optional(),
    federation_trust_mark_list_endpoint: z.string().optional(),
    federation_trust_mark_status_endpoint: z.string().optional(),
    homepage_uri: z.string().optional(),
    logo_uri: z.string().optional(),
    organization_name: z.string().optional(),
    policy_uri: z.string().optional(),
  })
  .loose();

// Structure common to every Entity Configuration document
export type BaseEntityConfiguration = z.infer<typeof BaseEntityConfiguration>;
export const BaseEntityConfiguration = z.object({
  header: EntityConfigurationHeader,
  payload: z
    .object({
      authority_hints: z.array(z.string()).optional(),
      exp: UnixTime,
      iat: UnixTime,
      iss: z.string(),
      jwks: z.object({
        keys: z.array(JWK),
      }),
      metadata: z
        .object({
          federation_entity: FederationEntityMetadata,
        })
        .loose(),
      sub: z.string(),
    })
    .loose(),
});

export const FederationListResponse = z.array(z.string());
