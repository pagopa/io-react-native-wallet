import { SDJwtInstance, type SDJwt } from "@sd-jwt/core";
import { getClaims } from "@sd-jwt/decode";
import { digest } from "@sd-jwt/crypto-nodejs";
import type { DcqlSdJwtVcCredential } from "dcql";
import { IoWalletError } from "../../../../utils/errors";
import { LEGACY_SD_JWT } from "../../../../sd-jwt/types";
import type { Credential4Dcql } from "../../api";

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
  const sdJwt = new SDJwtInstance({
    hasher: digest,
  });

  return Promise.all(
    credentials.map(async (credential) => {
      const decodedRawSdJwt = await sdJwt.decode(credential[1]);
      const claims = await getClaimsFromDecodedSdJwt(decodedRawSdJwt);
      return {
        vct: decodedRawSdJwt.jwt?.payload?.vct as string,
        credential_format:
          decodedRawSdJwt.jwt?.header?.typ === LEGACY_SD_JWT
            ? LEGACY_SD_JWT
            : "dc+sd-jwt",
        cryptographic_holder_binding: true,
        claims,
        original_credential: credential,
      } satisfies CustomDcqlSdJwtVcCredential;
    })
  );
};
