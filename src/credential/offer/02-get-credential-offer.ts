import { IssuerResponseError } from "../../utils/errors";
import { Logger, LogLevel } from "../../utils/logging";
import { hasStatusOrThrow } from "../../utils/misc";
import { InvalidCredentialOfferError } from "./errors";
import type { CredentialOffer } from "./types";
import { CredentialOfferSchema } from "./types";

export type GetCredentialOffer = (
  credentialOfferUri: string,
  context: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<CredentialOffer>;

/**
 * Fetches and validates a credential offer from a given URI.
 *
 * This function performs an HTTP GET request to the specified `credentialOfferUri`,
 * expecting a JSON response that matches the `CredentialOfferSchema`. If the response
 * is invalid or does not conform to the schema, an error is logged and an
 * `InvalidCredentialOfferError` is thrown.
 *
 * @param credentialOfferUri - The URI from which to fetch the credential offer.
 * @param context - Optional context object that may provide a custom `appFetch` implementation.
 * @returns The validated credential offer data.
 * @throws {IssuerResponseError} If the HTTP response status is not 200.
 * @throws {InvalidCredentialOfferError} If the response does not match the expected schema.
 */
export const getCredentialOffer: GetCredentialOffer = async (
  uri: string,
  context = {}
) => {
  const { appFetch = fetch } = context;

  const response = await appFetch(uri, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then(hasStatusOrThrow(200, IssuerResponseError))
    .then((reqUri) => reqUri.json());

  const credentialOffer = CredentialOfferSchema.safeParse(response);
  if (!credentialOffer.success) {
    Logger.log(
      LogLevel.ERROR,
      `Invalid credential offer fetched from URI: ${uri} - ${credentialOffer.error.message}`
    );
    throw new InvalidCredentialOfferError(
      `Invalid credential offer fetched from URI: ${uri} - ${credentialOffer.error.message}`
    );
  }

  return credentialOffer.data;
};
