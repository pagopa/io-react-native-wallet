import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import { hasStatusOrThrow } from "../utils/misc";
import { IoWalletError } from "../utils/errors";
import { DigitalCredentialsCatalogue } from "./types";
import { getTrustAnchorEntityConfiguration } from "../trust/build-chain";

type GetCatalogueContext = {
  appFetch?: GlobalFetch["fetch"];
};

/**
 * Fetch and parse the Digital Credential Catalogue from the Trust Anchor.
 * The catalogue's JWT signature is verified against the Trust Anchor's JWKs.
 *
 * @param trustAnchorUrl Base URL of the Trust Anchor
 * @param context.appFetch (optional) fetch API implementation. Default: built-in fetch
 * @returns The Digital Credential Catalogue payload
 */
export const fetchAndParseCatalogue = async (
  trustAnchorBaseUrl: string,
  { appFetch = fetch }: GetCatalogueContext = {}
): Promise<DigitalCredentialsCatalogue["payload"]> => {
  const trustAnchorConfig =
    await getTrustAnchorEntityConfiguration(trustAnchorBaseUrl);

  const responseText = await appFetch(
    `${trustAnchorConfig.payload.sub}/.well-known/credential-catalogue`,
    { method: "GET" }
  )
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());

  const responseJwt = decodeJwt(responseText);
  const catalogueKid = responseJwt.protectedHeader.kid;

  const trustAnchorJwk = trustAnchorConfig.payload.jwks.keys.find(
    (jwk) => jwk.kid === catalogueKid
  );

  if (!trustAnchorJwk) {
    throw new IoWalletError(
      `Could not find JWK with kid ${catalogueKid} in Trust Anchor's Entity Configuration`
    );
  }

  await verify(responseText, trustAnchorJwk);

  const parsedDigitalCredentialsCatalogue = DigitalCredentialsCatalogue.parse({
    header: responseJwt.protectedHeader,
    payload: responseJwt.payload,
  });

  return parsedDigitalCredentialsCatalogue.payload;
};
