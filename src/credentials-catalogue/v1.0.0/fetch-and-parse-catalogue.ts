import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import { hasStatusOrThrow } from "../../utils/misc";
import { IoWalletError } from "../../utils/errors";
import { getTrustAnchorEntityConfiguration } from "../../trust/build-chain";
import { type CredentialsCatalogueApi as Api } from "../api";
import { mapToCredentialsCatalogue } from "./mappers";

export const fetchAndParseCatalogue: Api["fetchAndParseCatalogue"] = async (
  trustAnchorBaseUrl,
  { appFetch = fetch } = {}
) => {
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

  return mapToCredentialsCatalogue({
    header: responseJwt.protectedHeader,
    payload: responseJwt.payload,
  });
};
