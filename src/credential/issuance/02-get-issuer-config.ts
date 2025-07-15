import type { StartFlow } from "./01-start-flow";
import { pathInsert, type Out } from "../../utils/misc";
import type { JWK } from "src/utils/jwk";
import { getCredentialIssuerMetadata } from "../../entity/openid-connect/issuer";
import type { CredentialConfigurationSupported } from "../../entity/openid-connect/issuer/types";
import { getCredentialIssuerEntityConfiguration } from "@pagopa/io-react-native-wallet";

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
  const res = await getCredentialIssuerMetadata(issuerUrl, {
    appFetch: context.appFetch,
  });

  return credentialIssuerRationalization(res);
};

/**
 * WARNING: This function must be called after {@link startFlow}. The next function to be called is {@link startUserAuthorization}.
 * WARNING: This function extracts the {@link IssuerConfig} from the OpenID Federation EC. For the OpenID Connect variant, use {@link getIssuerConfig}.
 * WARNING: The variants should not be used in conjunction.
 * Get the Issuer's configuration from the Issuer's metadata fetched from the OpenID Federation system.
 * Currently it only supports a mixed configuration based on OpenID Federation partial implementation.
 * @param issuerUrl The base url of the Issuer returned by {@link startFlow}
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The Issuer's configuration
 */
export const getIssuerConfigOIDFED: GetIssuerConfig = async (
  issuerUrl,
  context = {}
): ReturnType<GetIssuerConfig> => {
  const res = await getCredentialIssuerEntityConfiguration(issuerUrl, {
    appFetch: context.appFetch,
  });

  return credentialIssuerRationalizationOIDFED(res);
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
      issuer: issuerMetadata.authorization_endpoint,
    },
  };
};

/**
 * Rationalize the issuer's metadata taken from OpenID Federation to the issuer's configuration which is then used in our flows to interact with the issuer.
 * @param issuerMetadata - The issuer's metadata
 * @returns the isssuer configuration to be used later in our flows
 */
const credentialIssuerRationalizationOIDFED = (
  issuerMetadata: Awaited<
    ReturnType<typeof getCredentialIssuerEntityConfiguration>
  >
): Awaited<ReturnType<GetIssuerConfig>> => {
  const adapted_credential_configurations_supported: CredentialConfigurationSupported =
    Object.fromEntries(
      Object.entries(
        issuerMetadata.payload.metadata.openid_credential_issuer
          .credential_configurations_supported
      ).map(([key, config]) => {
        const claimsRaw = config.claims;

        const claims : CredentialConfigurationSupported[string]["claims"] = Object.entries(claimsRaw).map(([, v]) => ({
              path: v.path,
              details: {
                mandatory: v.mandatory,
                display: v.display,
              },
          })).reduce((cumulated, entry) =>
              pathInsert(cumulated, entry.path, entry.details)
            ,{})

        const newConfig: CredentialConfigurationSupported[string] = {
          ...config,
          claims,
          // cryptographic_suites_supported have been renamed credential_signing_alg_values_supported.
          // We mantain it for Potential compatibility
          cryptographic_suites_supported:
            config.credential_signing_alg_values_supported!,
        };

        return [key, newConfig];
      })
    );

  return {
    issuerConf: {
      credential_configurations_supported:
        adapted_credential_configurations_supported,
      pushed_authorization_request_endpoint:
        issuerMetadata.payload.metadata.oauth_authorization_server
          .pushed_authorization_request_endpoint,
      authorization_endpoint:
        issuerMetadata.payload.metadata.oauth_authorization_server
          .authorization_endpoint,
      token_endpoint:
        issuerMetadata.payload.metadata.oauth_authorization_server
          .token_endpoint,
      credential_endpoint:
        issuerMetadata.payload.metadata.openid_credential_issuer
          .credential_endpoint,
      keys: issuerMetadata.payload.metadata.openid_credential_issuer.jwks.keys,
      issuer: issuerMetadata.payload.metadata.oauth_authorization_server.issuer,
      nonce_endpoint:
        issuerMetadata.payload.metadata.openid_credential_issuer.nonce_endpoint,
    },
  };
};
