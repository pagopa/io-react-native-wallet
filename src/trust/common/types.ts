import * as z from "zod";
import { JWK } from "../../utils/jwk";
import { UnixTime } from "../../utils/zod";

export const TrustMark = z.object({ id: z.string(), trust_mark: z.string() });
export type TrustMark = z.infer<typeof TrustMark>;

export type EntityStatement = z.infer<typeof EntityStatement>;
export const EntityStatement = z.object({
  header: z.object({
    typ: z.literal("entity-statement+jwt"),
    alg: z.string(),
    kid: z.string(),
  }),
  payload: z.object({
    iss: z.string(),
    sub: z.string(),
    jwks: z.object({ keys: z.array(JWK) }),
    trust_marks: z.array(TrustMark).optional(),
    iat: z.number(),
    exp: z.number(),
  }),
});

export type EntityConfigurationHeader = z.infer<
  typeof EntityConfigurationHeader
>;
export const EntityConfigurationHeader = z.object({
  typ: z.literal("entity-statement+jwt"),
  alg: z.string(),
  kid: z.string(),
});

/**
 * @see https://openid.net/specs/openid-federation-1_0-41.html
 */
const FederationEntityMetadata = z
  .object({
    federation_fetch_endpoint: z.string().optional(),
    federation_list_endpoint: z.string().optional(),
    federation_resolve_endpoint: z.string().optional(),
    federation_trust_mark_status_endpoint: z.string().optional(),
    federation_trust_mark_list_endpoint: z.string().optional(),
    federation_trust_mark_endpoint: z.string().optional(),
    federation_historical_keys_endpoint: z.string().optional(),
    endpoint_auth_signing_alg_values_supported: z.string().optional(),
    organization_name: z.string().optional(),
    homepage_uri: z.string().optional(),
    policy_uri: z.string().optional(),
    logo_uri: z.string().optional(),
    contacts: z.array(z.string()).optional(),
  })
  .passthrough();

// Structure common to every Entity Configuration document
export type BaseEntityConfiguration = z.infer<typeof BaseEntityConfiguration>;
export const BaseEntityConfiguration = z.object({
  header: EntityConfigurationHeader,
  payload: z
    .object({
      iss: z.string(),
      sub: z.string(),
      iat: UnixTime,
      exp: UnixTime,
      authority_hints: z.array(z.string()).optional(),
      metadata: z
        .object({
          federation_entity: FederationEntityMetadata,
        })
        .passthrough(),
      jwks: z.object({
        keys: z.array(JWK),
      }),
    })
    .passthrough(),
});

export const FederationListResponse = z.array(z.string());
