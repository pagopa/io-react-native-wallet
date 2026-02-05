import { IssuerResponseError } from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import { hasStatusOrThrow } from "../../../utils/misc";
import { InvalidCredentialOfferError } from "../common/errors";
import { CredentialOfferSchema } from "./types";
import type { OfferApi } from "../api";

export const fetchCredentialOffer: OfferApi["fetchCredentialOffer"] = async (
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
