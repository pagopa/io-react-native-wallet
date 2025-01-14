import {
  OpenConnectCredentialIssuer,
  OpenConnectCredentialIssuerConfiguration,
  OpenConnectCredentialIssuerKeys,
} from "./types";
import { hasStatusOrThrow } from "../../utils/misc";

/**
 * Fetch the signed entity configuration token for an entity
 *
 * @param entityBaseUrl The url of the entity to fetch
 * @param param.appFetch (optional) fetch api implemention
 * @returns The signed Entity Configuration token
 */
async function fetchOpenIdCredentialIssuerMetadata(
  entityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<OpenConnectCredentialIssuer> {
  const wellKnownUrl = `${entityBaseUrl}/.well-known/openid-credential-issuer`;

  return await appFetch(wellKnownUrl, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(OpenConnectCredentialIssuer.parse);
}

async function fetchOpenIdCredentialIssuerConfiguration(
  entityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<OpenConnectCredentialIssuerConfiguration> {
  const wellKnownUrl = `${entityBaseUrl}/.well-known/openid-configuration`;

  return await appFetch(wellKnownUrl, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(OpenConnectCredentialIssuerConfiguration.parse);
}

async function fetchOpenIdCredentialConfigurationkeys(
  jwksUri: OpenConnectCredentialIssuerConfiguration["jwks_uri"],
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<OpenConnectCredentialIssuerKeys> {
  return await appFetch(jwksUri, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(OpenConnectCredentialIssuerKeys.parse);
}

export const getOpenIdCredentialIssuerMetadata = async (
  entityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<{
  issuerMetadata: OpenConnectCredentialIssuer;
  issuerConf: OpenConnectCredentialIssuerConfiguration;
  issuerKeys: OpenConnectCredentialIssuerKeys;
}> => {
  const issuerMetadata = await fetchOpenIdCredentialIssuerMetadata(
    entityBaseUrl,
    {
      appFetch,
    }
  );

  const issuerConf = await fetchOpenIdCredentialIssuerConfiguration(
    entityBaseUrl,
    {
      appFetch,
    }
  );

  const issuerKeys = await fetchOpenIdCredentialConfigurationkeys(
    issuerConf.jwks_uri,
    {
      appFetch,
    }
  );

  return { issuerMetadata, issuerConf, issuerKeys };
};
