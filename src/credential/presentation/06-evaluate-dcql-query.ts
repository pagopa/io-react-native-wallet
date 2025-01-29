import type { DisclosureWithEncoded } from "../../sd-jwt/types";
import type { RequestObject } from "./types";

export type EvaluateDcqlQuery = (
  requestObject: RequestObject,
  disclosures: DisclosureWithEncoded[],
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => EvaluatedDisclosures;

export type EvaluatedDisclosures = {
  requiredDisclosures: DisclosureWithEncoded[];
  optionalDisclosures: DisclosureWithEncoded[];
};

export const evaluateDcqlQuery: EvaluateDcqlQuery = (
  requestObject,
  disclosures
) => {
  // https://openid.net/specs/openid-4-verifiable-presentations-1_0-22.html#name-selecting-claims-and-creden
  const credentials = requestObject.dcql_query.credentials.reduce(
    (acc, credential) => {
      // Request all claims in the credential
      if (!credential.claims) {
        return {
          ...acc,
          [credential.id]: {
            requiredDisclosures: disclosures,
            optionalDisclosures: [],
          },
        };
      }

      // Request all claims specified in `claims`
      if (!credential.claim_sets) {
        // TODO: find JSON claims according to https://openid.net/specs/openid-4-verifiable-presentations-1_0-22.html#name-claims-path-pointer
        return {
          ...acc,
          [credential.id]: {
            requiredDisclosures: credential.claims.map(({ path }) => {
              const [claimId] = path; // WARNING: non-compliant!
              const disclosure = disclosures.find(
                ({ decoded }) => decoded[1] === claimId
              );
              if (!disclosure) {
                // What?
              }
              return disclosure;
            }),
            optionalDisclosures: [],
          },
        };
      }

      // Request only claims specified in `claim_sets`
      return {
        ...acc,
        [credential.id]: {
          requiredDisclosures: [],
          optionalDisclosures: [],
        },
      };
    },
    {} as Record<string, EvaluatedDisclosures>
  );

  return credentials;
};
