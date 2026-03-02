import { z } from "zod";
import { UnixTime } from "../utils/zod";
import { JWK } from "../utils/jwk";

/**
 * For backward compatibility reasons it is still necessary to support the legacy SD-JWT
 * in a few flows (for instance status assertion and presentation of the old eID).
 */
export type SupportedSdJwtLegacyFormat = typeof LEGACY_SD_JWT;
export const LEGACY_SD_JWT = "vc+sd-jwt";

const StatusAssertion = z.object({
  credential_hash_alg: z.literal("sha-256"),
});

const StatusList = z.object({
  idx: z.string(),
  uri: z.string(),
});

/**
 * Type for a Verifiable Credential base payload in SD-JWT format.
 * It only contains common claims across versions.
 */
export type SdJwt4VCBasePayload = z.infer<typeof SdJwt4VCBasePayload>;
export const SdJwt4VCBasePayload = z.object({
  _sd: z.array(z.string()),
  _sd_alg: z.literal("sha-256"),
  iss: z.string(),
  sub: z.string(),
  iat: UnixTime.optional(),
  exp: UnixTime,
  cnf: z.object({
    jwk: JWK,
  }),
  status: z.union([
    z.object({
      status_list: StatusList,
    }),
    z.object({
      /** @deprecated Use `status.status_list` */
      status_assertion: StatusAssertion,
    }),
  ]),
  vct: z.string(),
  "vct#integrity": z.string().optional(),
});

/**
 * Object containing User authentication and User data verification information.
 * Useful to extract the assurance level to determine L2/L3 authentication.
 */
export type Verification = z.infer<typeof Verification>;
export const Verification = z.object({
  trust_framework: z.string(),
  assurance_level: z.string(),
  evidence: z.array(
    z.object({
      type: z.literal("vouch"),
      // Support both string and UNIX timestamp for backward compatibility
      time: z.union([z.string(), z.number()]),
      attestation: z.object({
        type: z.literal("digital_attestation"),
        reference_number: z.string(),
        date_of_issuance: z.string(),
        voucher: z.object({ organization: z.string() }),
      }),
    })
  ),
});

/**
 * Metadata for a digital credential. This information is retrieved from the URL defined in the `vct` claim.
 *
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.0.1/en/credential-data-model.html#digital-credential-metadata-type
 */
export type TypeMetadata = z.infer<typeof TypeMetadata>;
export const TypeMetadata = z.object({
  name: z.string(),
  description: z.string(),
  data_source: z.object({
    trust_framework: z.string(),
    authentic_source: z.object({
      organization_name: z.string(),
      organization_code: z.string(),
      contacts: z.array(z.string()),
      homepage_uri: z.string().url(),
      logo_uri: z.string().url(),
    }),
  }),
});
