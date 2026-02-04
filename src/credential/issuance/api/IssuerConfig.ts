import { z } from "zod";
import { JWK } from "../../../utils/jwk";

const DisplayConfig = z.object({
  name: z.string(),
  locale: z.string(),
});

const ClaimConfig = z.object({
  path: z.array(z.union([z.string(), z.number(), z.null()])),
  display: z.array(DisplayConfig),
});

const IssuanceErrorSupported = z.object({
  display: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      locale: z.string(),
    })
  ),
});

const CredentialConfig = z.intersection(
  z.discriminatedUnion("format", [
    z.object({ format: z.literal("dc+sd-jwt"), vct: z.string() }),
    z.object({ format: z.literal("mso_mdoc"), doctype: z.string() }),
  ]),
  z.object({
    scope: z.string(),
    display: z.array(DisplayConfig),
    claims: z.array(ClaimConfig),
    /**
     * @deprecated Use the Credentials Catalogue to get the Auth Source
     */
    authentic_source: z.string().optional(),
    /**
     * @deprecated Kept for backward compatibility with v0.7.1
     */
    issuance_errors_supported: z.record(IssuanceErrorSupported).optional(),
  })
);

/**
 * Common Issuer configuration, decoupled from specific IT-Wallet versions.
 */
export type IssuerConfig = z.infer<typeof IssuerConfig>;
export const IssuerConfig = z.object({
  credential_issuer: z.string(),
  pushed_authorization_request_endpoint: z.string(),
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  nonce_endpoint: z.string(),
  status_assertion_endpoint: z.string().optional(),
  credential_endpoint: z.string(),
  keys: z.array(JWK),
  credential_configurations_supported: z.record(CredentialConfig),
  /**
   * @deprecated
   */
  response_modes_supported: z.array(z.string()).optional(),
});
