import type { StartFlow } from "./01-start-flow";
import type { Out } from "../../utils/misc";
import type { JWK } from "src/utils/jwk";
import { getCredentialIssuerMetadata } from "../../entity/openid-connect/issuer";
import type { CredentialConfigurationSupported } from "../../entity/openid-connect/issuer/types";

export type GetIssuerConfig = (
  issuerUrl: Out<StartFlow>["issuerUrl"],
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{ issuerConf: IssuerConfig }>;

/**
 * Common configuration for the issuer.
 * This is needed to have a common configuration for the issuer to be used in our flows.
 * It allows to support multiple issuers with different configurations, defining a common interface to interact with them.
 */
export type IssuerConfig = {
  credential_configurations_supported: CredentialConfigurationSupported;
  pushed_authorization_request_endpoint: string;
  authorization_endpoint: string;
  token_endpoint: string;
  credential_endpoint: string;
  keys: Array<JWK>;
};

/**
 * WARNING: This function must be called after {@link startFlow}. The next function to be called is {@link startUserAuthorization}.
 * Get the Issuer's configuration from the Issuer's metadata.
 * Currently it only supports a mixed configuration based on OpenID Connect partial implementation.
 * @param issuerUrl The base url of the Issuer returned by {@link startFlow}
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The Issuer's configuration
 */
export const getIssuerConfig: GetIssuerConfig = async (
  issuerUrl,
  context = {}
): ReturnType<GetIssuerConfig> => {
  const res = await getCredentialIssuerMetadata(issuerUrl, {
    appFetch: context.appFetch,
  });

  return credentialIssuerRationalization(res);
};

/**
 * Rationalize the issuer's metadata to the issuer's configuration which is then used in our flows to interact with the issuer.
 * @param issuerMetadata - The issuer's metadata
 * @returns the isssuer configuration to be used later in our flows
 */
const credentialIssuerRationalization = (
  issuerMetadata: Awaited<ReturnType<typeof getCredentialIssuerMetadata>>
): Awaited<ReturnType<GetIssuerConfig>> => {
  return {
    issuerConf: {
      credential_configurations_supported:
        issuerMetadata.credential_configurations_supported,
      pushed_authorization_request_endpoint:
        issuerMetadata.pushed_authorization_request_endpoint,
      authorization_endpoint: issuerMetadata.authorization_endpoint,
      token_endpoint: issuerMetadata.token_endpoint,
      credential_endpoint: issuerMetadata.credential_endpoint,
      keys: issuerMetadata.jwks.keys,
    },
  };
};
