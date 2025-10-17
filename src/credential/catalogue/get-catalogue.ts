import { hasStatusOrThrow } from "../../utils/misc";
import { DigitalCredentialCatalogue } from "./types";

type GetCatalogueContext = {
  appFetch?: GlobalFetch["fetch"];
};

/**
 * Fetch and parse the Digital Credential Catalogue from the Trust Anchor.
 *
 * @param trustAnchorUrl Base URL of the Trust Anchor
 * @param context.appFetch (optional) fetch API implementation. Default: built-in fetch
 * @returns The Digital Credential Catalogue payload
 */
export const getCatalogue = (
  trustAnchorUrl: string,
  { appFetch = fetch }: GetCatalogueContext = {}
): Promise<DigitalCredentialCatalogue["payload"]> => {
  return appFetch(trustAnchorUrl, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(DigitalCredentialCatalogue.parse)
    .then(({ payload }) => payload);
};
