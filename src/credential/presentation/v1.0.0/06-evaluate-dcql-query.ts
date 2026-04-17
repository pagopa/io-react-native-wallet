import { DcqlQuery, DcqlError } from "dcql";
import { isValiError } from "valibot";
import { CredentialsNotFoundError } from "../common/errors";
import type { Credential4Dcql, RemotePresentationApi } from "../api";
import type { CredentialPurpose } from "../api/06-evaluate-dcql-query";
import * as sdJwtUtils from "../common/utils/sd-jwt";
import {
  extractFailedCredentialsDetails,
  getClaimsFromDcqlMatch,
  getDcqlQueryMatches,
  getPresentationFrameFromDcqlMatch,
} from "../common/utils/dcql";
import { LEGACY_SD_JWT } from "../../../sd-jwt/types";

export const evaluateDcqlQuery: RemotePresentationApi["evaluateDcqlQuery"] =
  async (query, credentialsSdJwt) => {
    const credentials = await sdJwtUtils.mapCredentialsToObj(credentialsSdJwt);

    const credentialsByVct = credentials.reduce(
      (acc, c) => {
        acc[c.vct] = c.original_credential;
        return acc;
      },
      {} as Record<string, Credential4Dcql>
    );

    try {
      // Validate the query
      const parsedQuery = DcqlQuery.parse(query);
      DcqlQuery.validate(parsedQuery);

      const queryResult = DcqlQuery.query(parsedQuery, credentials);

      if (!queryResult.can_be_satisfied) {
        throw new CredentialsNotFoundError(
          extractFailedCredentialsDetails(queryResult)
        );
      }

      return getDcqlQueryMatches(queryResult).map(([id, match]) => {
        const purposes = queryResult.credential_sets
          ?.filter((set) => set.matching_options?.flat().includes(id))
          ?.map<CredentialPurpose>((credentialSet) => ({
            description: credentialSet.purpose?.toString(),
            required: Boolean(credentialSet.required),
          }));

        const matchOutput = match.valid_credentials[0]?.meta.output;

        // The legacy SD-JWT format is still supported because `evaluateDcqlQuery`
        // is also used when presenting the legacy 0.7.1 eID to get other credentials.
        if (
          matchOutput?.credential_format === "dc+sd-jwt" ||
          (matchOutput?.credential_format === LEGACY_SD_JWT &&
            "vct" in matchOutput)
        ) {
          const { vct } = matchOutput;
          const [keyTag, credential] = credentialsByVct[vct]!;

          const requiredDisclosures = getClaimsFromDcqlMatch(match);
          const presentationFrame = getPresentationFrameFromDcqlMatch(
            match,
            parsedQuery
          );

          return {
            id,
            vct,
            keyTag,
            format: matchOutput.credential_format,
            credential,
            requiredDisclosures,
            presentationFrame,
            // When it is a match but no credential_sets are found, the credential is required by default
            // See https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-6.4.2
            purposes: purposes ?? [{ required: true }],
          };
        }

        throw new Error(
          `Unsupported credential format: ${matchOutput?.credential_format}`
        );
      });
    } catch (error) {
      // Invalid DCQL query structure. Remap to `DcqlError` for consistency.
      if (isValiError(error)) {
        throw new DcqlError({
          message: "Failed to parse the provided DCQL query",
          code: "PARSE_ERROR",
          cause: error.issues,
        });
      }

      // Let other errors propagate so they can be caught with `err instanceof DcqlError`
      throw error;
    }
  };
