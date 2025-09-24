import type { StartFlow } from "./01-start-flow";
import { type Out } from "../../utils/misc";
import type { JWK } from "src/utils/jwk";
import {
  getCredentialIssuerOauthMetadata,
  getCredentialIssuerMetadata,
  getCredentialIssuerSigningJWKS,
} from "../../entity/openid-connect/issuer";
import type {
  CredentialConfigurationSupported,
  CredentialIssuerKeys,
} from "../../entity/openid-connect/issuer/types";

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
  batch_size : number;
  authorization_endpoint: string;
  token_endpoint: string;
  nonce_endpoint?: string;
  credential_endpoint: string;
  issuer: string;
  keys: Array<JWK>;
};

/**
 * WARNING: This function must be called after {@link startFlow}. The next function to be called is {@link startUserAuthorization}.
 * WARNING: This function extracts the {@link IssuerConfig} from the OpenID Connect endpoint. For the OpenID Federation variant, use {@link getIssuerConfigOIDFED}.
 * WARNING: The variants should not be used in conjunction.
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
  const appFetch = { appFetch: context.appFetch };
  const [oidMetadata, oauthServerMetadata, credentialIssuerKeys] =
    await Promise.all([
      getCredentialIssuerMetadata(issuerUrl, appFetch),
      getCredentialIssuerOauthMetadata(issuerUrl, appFetch),
      getCredentialIssuerSigningJWKS(issuerUrl, appFetch),
    ]);

  return credentialIssuerRationalization(
    oidMetadata,
    oauthServerMetadata,
    credentialIssuerKeys
  );
};

/**
 * Rationalize the issuer's metadata to the issuer's configuration which is then used in our flows to interact with the issuer.
 * @param issuerMetadata - The issuer's metadata
 * @returns the isssuer configuration to be used later in our flows
 */
const credentialIssuerRationalization = (
  issuerMetadata: Awaited<ReturnType<typeof getCredentialIssuerMetadata>>,
  oauthServerMetadata: Awaited<
    ReturnType<typeof getCredentialIssuerOauthMetadata>
  >,
  credentialIssuerKeys: CredentialIssuerKeys
): Awaited<ReturnType<GetIssuerConfig>> => {
  return {
    issuerConf: {
      credential_configurations_supported:
        issuerMetadata.credential_configurations_supported,
      batch_size : issuerMetadata.batch_credential_issuance.batch_size,
      authorization_endpoint: oauthServerMetadata.authorization_endpoint,
      token_endpoint: oauthServerMetadata.token_endpoint,
      credential_endpoint: issuerMetadata.credential_endpoint,
      keys: credentialIssuerKeys.keys,
      issuer: issuerMetadata.credential_issuer,
    },
  };
};
