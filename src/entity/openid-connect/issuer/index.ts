import { hasStatusOrThrow } from "../../../utils/misc";
import {
  CredentialIssuerConfiguration,
  CredentialIssuerKeys,
  CredentialIssuerOauthAuthorizationServer,
  CredentialIssuerOpenidCondiguration,
} from "./types";

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

/**
 * Fetch the necessary OAuth metadata from the issuer's oauth-authorization-server endpoint
 *
 * @param entityBaseUrl The url of the entity to fetch
 * @param param.appFetch (optional) fetch api implemention
 * @returns The signed Entity Configuration token
 */
export async function getCredentialIssuerOauthMetadata(
  entityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<CredentialIssuerOauthAuthorizationServer> {
  const wellKnownUrl = `${entityBaseUrl}/.well-known/oauth-authorization-server`;

  return await appFetch(wellKnownUrl, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(CredentialIssuerOauthAuthorizationServer.parse);
}

/**
 * Fetch the jwks from the location specified at the openid-configuration endpoint
 *
 * @param entityBaseUrl The url of the entity to fetch
 * @param param.appFetch (optional) fetch api implemention
 * @returns The signed Entity Configuration token
 */
export async function getCredentialIssuerSigningJWKS(
  entityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<CredentialIssuerKeys> {
  const wellKnownUrl = `${entityBaseUrl}/.well-known/openid-configuration`;

  return await appFetch(wellKnownUrl, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(CredentialIssuerOpenidCondiguration.parse)
    .then((config) =>
      appFetch(config.jwks_uri, {
        method: "GET",
      })
    )
    .then((res) => res.json())
    .then(CredentialIssuerKeys.parse);
}
