import type { StartFlow } from "./01-start-flow";
import type { Out } from "../../utils/misc";
import { getOpenIdCredentialIssuerMetadata } from "../../entity/connect-discovery";
import type { JWK } from "src/utils/jwk";
import type { OpenConnectCredentialConfigurationsSupported } from "../../entity/connect-discovery/types";

export type GetIssuerConfig = (
  issuerUrl: Out<StartFlow>["issuerUrl"],
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{ issuerConf: IssuerConfig }>;

export type IssuerConfig = {
  credential_configurations_supported: OpenConnectCredentialConfigurationsSupported;
  pushed_authorization_request_endpoint: string;
  authorization_endpoint: string;
  token_endpoint: string;
  credential_endpoint: string;
  keys: Array<JWK>;
};

/**
 * WARNING: This function must be called after {@link startFlow}. The next function to be called is {@link startUserAuthorization}.
 * The Issuer trust evaluation phase.
 * Fetch the Issuer's configuration and verify trust.
 *
 * @param issuerUrl The base url of the Issuer returned by {@link startFlow}
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The Issuer's configuration
 */
export const getIssuerConfig: GetIssuerConfig = async (
  issuerUrl,
  context = {}
): ReturnType<GetIssuerConfig> => {
  const { issuerMetadata, issuerConf, issuerKeys } =
    await getOpenIdCredentialIssuerMetadata(issuerUrl, {
      appFetch: context.appFetch,
    });
  return openIdCredentialIssuerRationalization(
    issuerMetadata,
    issuerConf,
    issuerKeys
  );
};

const openIdCredentialIssuerRationalization = (
  issuerMetadata: Awaited<
    ReturnType<typeof getOpenIdCredentialIssuerMetadata>
  >["issuerMetadata"],
  issuerConf: Awaited<
    ReturnType<typeof getOpenIdCredentialIssuerMetadata>
  >["issuerConf"],
  issuerKeys: Awaited<
    ReturnType<typeof getOpenIdCredentialIssuerMetadata>
  >["issuerKeys"]
): Awaited<ReturnType<GetIssuerConfig>> => {
  return {
    issuerConf: {
      credential_configurations_supported:
        issuerMetadata.credential_configurations_supported,
      pushed_authorization_request_endpoint:
        issuerConf.pushed_authorization_request_endpoint,
      authorization_endpoint: issuerConf.authorization_endpoint,
      token_endpoint: issuerConf.token_endpoint,
      credential_endpoint: issuerMetadata.credential_endpoint,
      keys: issuerKeys.keys,
    },
  };
};
