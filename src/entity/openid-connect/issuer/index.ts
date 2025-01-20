import { hasStatusOrThrow } from "../../../utils/misc";
import { CredentialIssuerConfiguration } from "./types";

/**
 * Fetch the signed entity configuration token for an entity
 *
 * @param entityBaseUrl The url of the entity to fetch
 * @param param.appFetch (optional) fetch api implemention
 * @returns The signed Entity Configuration token
 */
export async function getCredentialIssuerMetadata(
  entityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<CredentialIssuerConfiguration> {
  const wellKnownUrl = `${entityBaseUrl}/.well-known/openid-credential-issuer`;

  return await appFetch(wellKnownUrl, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(CredentialIssuerConfiguration.parse);
}
