import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { hasStatusOrThrow } from "../../utils/misc";
import { DigitalCredentialsCatalogue } from "./types";

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
export const fetchAndParseCatalogue = async (
  trustAnchorUrl: string,
  { appFetch = fetch }: GetCatalogueContext = {}
): Promise<DigitalCredentialsCatalogue["payload"]> => {
  const responseText = await appFetch(
    `${trustAnchorUrl}/.well-known/credential-catalogue`,
    { method: "GET" }
  )
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());

  const responseJwt = decodeJwt(responseText);

  const parsedDigitalCredentialsCatalogue = DigitalCredentialsCatalogue.parse({
    header: responseJwt.protectedHeader,
    payload: responseJwt.payload,
  });

  return parsedDigitalCredentialsCatalogue.payload;
};
