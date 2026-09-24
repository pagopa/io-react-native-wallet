import { z } from "zod";

import { FederationEntityMetadata } from "../../../trust/common/types";
import { JWK } from "../../../utils/jwk";

const DisplayConfig = z.object({
  locale: z.string(),
  name: z.string(),
});

const ClaimConfig = z.object({
  display: z.array(DisplayConfig).optional(),
  path: z.array(z.union([z.string(), z.number(), z.null()])),
});

const IssuanceErrorSupported = z.object({
  display: z.array(
    z.object({
      description: z.string(),
      locale: z.string(),
      title: z.string(),
    }),
  ),
});

const CredentialConfig = z.intersection(
  z.discriminatedUnion("format", [
    z.object({ format: z.literal("dc+sd-jwt"), vct: z.string() }),
    z.object({ doctype: z.string(), format: z.literal("mso_mdoc") }),
  ]),
  z.object({
    /**
     * @deprecated Use the Credentials Catalogue to get the Auth Source
     */
    authentic_source: z.string().optional(),
    claims: z.array(ClaimConfig),
    display: z.array(DisplayConfig),
    /**
     * @deprecated Kept for backward compatibility with v0.7.1
     */
    issuance_errors_supported: z
      .record(z.string(), IssuanceErrorSupported)
      .optional(),
    scope: z.string(),
  }),
);

/**
 * Common Issuer configuration, decoupled from specific IT-Wallet versions.
 */
export type IssuerConfig = z.infer<typeof IssuerConfig>;
export const IssuerConfig = z.object({
  authorization_endpoint: z.string(),
  /**
   * Authorization Servers advertised by the Credential Issuer. Present when the
   * Issuer relies on one or more external Authorization Servers; used to validate
   * the `authorization_server` selected by a credential offer.
   */
  authorization_servers: z.tuple([z.string()], z.string()).optional(),
  credential_configurations_supported: z.record(z.string(), CredentialConfig),
  credential_endpoint: z.string(),
  credential_issuance_batch_size: z.number().optional(),
  credential_issuer: z.string(),
  encrypted_response_enc_values_supported: z.array(z.string()).optional(),
  federation_entity: FederationEntityMetadata,
  keys: z.array(JWK),
  nonce_endpoint: z.string(),
  pushed_authorization_request_endpoint: z.string(),
  /**
   * @deprecated
   */
  response_modes_supported: z.array(z.string()).optional(),
  status_assertion_endpoint: z.string().optional(),
  token_endpoint: z.string(),
});
