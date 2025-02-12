import {
  DcqlQuery,
  DcqlPresentationResult,
  DcqlError,
  DcqlCredentialSetError,
} from "dcql";
import { decode } from "../../sd-jwt";
import { ValiError } from "valibot";
import type { Disclosure } from "../../sd-jwt/types";

const mapCredentialToObject = (jwt: string) => {
  const { sdJwt, disclosures } = decode(jwt);
  return {
    vct: sdJwt.payload.vct,
    credential_format: sdJwt.header.typ, // TODO: handle mso_mdoc?
    claims: disclosures.reduce(
      (acc, disclosure) => ({
        ...acc,
        [disclosure.decoded[1]]: disclosure.decoded,
      }),
      {} as Record<string, Disclosure>
    ),
  };
};

export const evaluateDcqlQuery = (
  credentialJwts: string[],
  query: DcqlQuery.Input
) => {
  const credentialsMap = credentialJwts
    .map(mapCredentialToObject)
    .reduce(
      (acc, credential) => ({ ...acc, [credential.vct]: credential }),
      {} as Record<string, ReturnType<typeof mapCredentialToObject>>
    );

  try {
    // Validate the query
    const parsedQuery = DcqlQuery.parse(query);
    DcqlQuery.validate(parsedQuery);

    const presentationQueryResult = DcqlPresentationResult.fromDcqlPresentation(
      credentialsMap,
      { dcqlQuery: parsedQuery }
    );

    if (!presentationQueryResult.canBeSatisfied) {
      // TODO: handle query that cannot be satisfied, e.g. missing claims
    }

    return presentationQueryResult;
  } catch (error) {
    console.error(error);
    if (error instanceof ValiError) {
      // TODO: handle invalid DQCL query JSON structure
    }
    if (error instanceof DcqlError) {
      // TODO handle invalid DQCL query
    }
    if (error instanceof DcqlCredentialSetError) {
      // TODO handle missing credentials
    }
  }
};
