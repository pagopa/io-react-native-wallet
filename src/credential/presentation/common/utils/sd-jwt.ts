import { SDJwtInstance, type SDJwt } from "@sd-jwt/core";
import * as z from "zod";
import { getClaims } from "@sd-jwt/decode";
import { digest } from "@sd-jwt/crypto-nodejs";
import { IoWalletError } from "../../../../utils/errors";
import type { DcqlSdJwtVcCredential } from "dcql";
import type { Credential4Dcql } from "../../api";

// === Disclosure ============================================================

const SdDisclosureSchema = z.object({
  salt: z.string(),
  key: z.string().optional(),
  value: z.unknown(),
  _digest: z.string().optional(),
  _encoded: z.string().optional(),
});

// === JWT ===================================================================

const SdJwtHeaderSchema = z.object({
  alg: z.string(),
  typ: z.string(),
  kid: z.string().optional(),
  trust_chain: z.array(z.string()).optional(),
  x5c: z.array(z.string()).optional(),
  vctm: z.array(z.string()).optional(),
});

const SdJwtPayloadSchema = z
  .object({
    iss: z.string(),
    iat: z.number().optional(),
    exp: z.number(),
    vct: z.string(),
    _sd_alg: z.literal("sha-256"),
    _sd: z.array(z.string()),
    cnf: z.object({
      jwk: z.record(z.unknown()),
    }),

    status: z
      .object({
        identifier_list: z
          .object({
            id: z.string(),
            uri: z.string(),
          })
          .optional(),
        status_list: z
          .object({
            idx: z.number(),
            uri: z.string(),
          })
          .optional(),
      })
      .optional(),

    issuing_authority: z.string().optional(),
    issuing_country: z.string().optional(),

    "vct#integrity": z.string().optional(),

    sub: z.string().optional(),
  })
  .passthrough();

const SdJwtCoreSchema = z.object({
  header: SdJwtHeaderSchema,
  payload: SdJwtPayloadSchema,
  signature: z.string(),
  encoded: z.string(),
});

// === KB JWT ================================================================

const SdKbJwtSchema = z.object({
  header: z.record(z.unknown()),
  payload: z.record(z.unknown()),
  signature: z.string(),
  encoded: z.string(),
});

// === SD-JWT DECODED ========================================================

const SdJwtDecodedSchema = z.object({
  jwt: SdJwtCoreSchema,
  disclosures: z.array(SdDisclosureSchema),
  kbJwt: SdKbJwtSchema.optional(),
});

type SdJwtDecoded = z.infer<typeof SdJwtDecodedSchema>;

type CustomDcqlSdJwtVcCredential = DcqlSdJwtVcCredential & {
  original_credential: Credential4Dcql;
};

/**
 * List of claims to remove from the SD-JWT before evaluating the DCQL query.
 */
const NON_DISCLOSABLE_CLAIMS = ["status", "cnf", "exp"];

/**
 * Extract claims from disclosures for use in `dcql` library.
 */
const getClaimsFromDecodedSdJwt = async (decodedRawSdJwt: SDJwt) => {
  if (!decodedRawSdJwt.jwt?.payload) {
    throw new IoWalletError("Can't decode SD-JWT");
  }

  const claims = await getClaims<DcqlSdJwtVcCredential["claims"]>(
    decodedRawSdJwt.jwt.payload,
    decodedRawSdJwt.disclosures ?? [],
    digest
  );

  for (const claim of NON_DISCLOSABLE_CLAIMS) {
    delete claims[claim];
  }

  return claims;
};

/**
 * Convert a list of credential in SD-JWT format to a list of objects
 * with claims for correct parsing by the `dcql` library.
 * @param credentials The raw SD-JWT credentials
 * @returns List of `dcql` compatible objects
 */
export const mapCredentialsToObj = async (
  credentials: Credential4Dcql[]
): Promise<CustomDcqlSdJwtVcCredential[]> => {
  const sdJwt = new SDJwtInstance<SdJwtDecoded>({
    hasher: digest,
  });

  return Promise.all(
    credentials.map(async (credential) => {
      const decodedRawSdJwt = await sdJwt.decode(credential[1]);
      const claims = await getClaimsFromDecodedSdJwt(decodedRawSdJwt);
      return {
        vct: decodedRawSdJwt.jwt?.payload?.vct as string,
        credential_format: "dc+sd-jwt",
        cryptographic_holder_binding: true,
        claims,
        original_credential: credential,
      } satisfies CustomDcqlSdJwtVcCredential;
    })
  );
};
