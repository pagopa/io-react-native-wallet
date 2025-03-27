import {
  DcqlQuery,
  DcqlError,
  DcqlCredentialSetError,
  DcqlQueryResult,
} from "dcql";
import { isValiError } from "valibot";
import { decode, prepareVpToken } from "../../sd-jwt";
import type { Disclosure } from "../../sd-jwt/types";
import { ValidationFailed } from "../../utils/errors";
import { createCryptoContextFor } from "../../utils/crypto";
import type { RemotePresentation } from "./types";

/**
 * The purpose for the credential request by the RP.
 */
type CredentialPurpose = {
  required: boolean;
  description?: string;
};

export type EvaluateDcqlQuery = (
  credentialsSdJwt: [string /* keyTag */, string /* credential */][],
  query: DcqlQuery.Input
) => {
  id: string;
  credential: string;
  keyTag: string;
  requiredDisclosures: Disclosure[];
  purposes: CredentialPurpose[];
}[];

export type PrepareRemotePresentations = (
  credentials: {
    id: string;
    credential: string;
    keyTag: string;
    requestedClaims: string[];
  }[],
  nonce: string,
  clientId: string
) => Promise<RemotePresentation[]>;

type DcqlMatchSuccess = Extract<
  DcqlQueryResult.CredentialMatch,
  { success: true }
>;

/**
 * Convert a credential in JWT format to an object with claims
 * for correct parsing by the `dcql` library.
 */
const mapCredentialToObject = (jwt: string) => {
  const { sdJwt, disclosures } = decode(jwt);
  const credentialFormat = sdJwt.header.typ;

  // TODO [SIW-2082]: support MDOC credentials
  if (credentialFormat !== "vc+sd-jwt") {
    throw new Error(`Unsupported credential format: ${credentialFormat}`);
  }

  return {
    vct: sdJwt.payload.vct,
    credential_format: credentialFormat,
    claims: disclosures.reduce(
      (acc, disclosure) => ({
        ...acc,
        [disclosure.decoded[1]]: disclosure.decoded,
      }),
      {} as Record<string, Disclosure>
    ),
  };
};

/**
 * Extract only successful matches from the DCQL query result.
 */
const getDcqlQueryMatches = (result: DcqlQueryResult) =>
  Object.entries(result.credential_matches).filter(
    ([, match]) => match.success === true
  ) as [string, DcqlMatchSuccess][];

export const evaluateDcqlQuery: EvaluateDcqlQuery = (
  credentialsSdJwt,
  query
) => {
  const credentials = credentialsSdJwt.map(([, credential]) =>
    mapCredentialToObject(credential)
  );

  try {
    // Validate the query
    const parsedQuery = DcqlQuery.parse(query);
    DcqlQuery.validate(parsedQuery);

    const queryResult = DcqlQuery.query(parsedQuery, credentials);

    if (!queryResult.canBeSatisfied) {
      throw new Error("No credential can satisfy the provided DCQL query");
    }
    // Build an object vct:credentialJwt to map matched credentials to their JWT
    const credentialsSdJwtByVct = credentials.reduce(
      (acc, c, i) => ({ ...acc, [c.vct]: credentialsSdJwt[i]! }),
      {} as Record<string, [string /* keyTag */, string /* credential */]>
    );

    return getDcqlQueryMatches(queryResult).map(([id, match]) => {
      if (match.output.credential_format !== "vc+sd-jwt") {
        throw new Error("Unsupported format"); // TODO [SIW-2082]: support MDOC credentials
      }
      const { vct, claims } = match.output;

      const purposes = queryResult.credential_sets
        ?.filter((set) => set.matching_options?.flat().includes(id))
        ?.map<CredentialPurpose>((credentialSet) => ({
          description: credentialSet.purpose?.toString(),
          required: Boolean(credentialSet.required),
        }));

      const [keyTag, credential] = credentialsSdJwtByVct[vct]!;
      const requiredDisclosures = Object.values(claims) as Disclosure[];
      return {
        id,
        keyTag,
        credential,
        requiredDisclosures,
        // When it is a match but no credential_sets are found, the credential is required by default
        // See https://openid.net/specs/openid-4-verifiable-presentations-1_0-24.html#section-6.3.1.2-2.1
        purposes: purposes ?? [{ required: true }],
      };
    });
  } catch (error) {
    // Invalid DCQL query structure
    if (isValiError(error)) {
      throw new ValidationFailed({
        message: "Invalid DCQL query",
        reason: error.issues.map((issue) => issue.message).join(", "),
      });
    }

    if (error instanceof DcqlError) {
      // TODO [SIW-2110]: handle invalid DQCL query or let the error propagate
    }
    if (error instanceof DcqlCredentialSetError) {
      // TODO [SIW-2110]: handle missing credentials or let the error propagate
    }
    throw error;
  }
};

export const prepareRemotePresentations: PrepareRemotePresentations = async (
  credentials,
  nonce,
  clientId
) => {
  return Promise.all(
    credentials.map(async (item) => {
      const { vp_token } = await prepareVpToken(nonce, clientId, [
        item.credential,
        item.requestedClaims,
        createCryptoContextFor(item.keyTag),
      ]);

      return {
        credentialId: item.id,
        requestedClaims: item.requestedClaims,
        vpToken: vp_token,
        format: "vc+sd-jwt",
      };
    })
  );
};
