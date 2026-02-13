import type { MetadataResponse } from "@pagopa/io-wallet-oid4vci";
import type { ParsedAuthorizeRequestResult } from "@pagopa/io-wallet-oid4vp";
import { assert } from "../../../utils/misc";
import { createMapper } from "../../../utils/mappers";
import type { JWK } from "../../../utils/jwk";
import type { RequestObject } from "../../../credential/presentation";
import { IssuerConfig } from "../api/IssuerConfig";

type CredentialConfigurations =
  IssuerConfig["credential_configurations_supported"];
type OpenIdCredentialIssuer =
  MetadataResponse["metadata"]["openid_credential_issuer"];

const mapCredentialConfigurationsSupported = (
  oidIssuer: OpenIdCredentialIssuer
): CredentialConfigurations =>
  Object.entries(oidIssuer!.credential_configurations_supported).reduce(
    (acc, [key, config]) => {
      acc[key] = {
        ...(config.format === "dc+sd-jwt"
          ? { format: config.format, vct: config.vct }
          : { format: config.format, doctype: config.doctype }),
        scope: config.scope,
        display: config.credential_metadata.display!,
        claims:
          config.credential_metadata.claims?.map((claim) => ({
            path: claim.path,
            display: claim.display ?? [],
          })) ?? [],
      };
      return acc;
    },
    {} as CredentialConfigurations
  );

export const mapToIssuerConfig = createMapper<MetadataResponse, IssuerConfig>(
  (x) => {
    const { oauth_authorization_server, openid_credential_issuer } = x.metadata;

    assert(
      oauth_authorization_server,
      "oauth_authorization_server is required in Issuer metadata"
    );
    assert(
      openid_credential_issuer,
      "openid_credential_issuer is required in Issuer metadata"
    );

    return {
      authorization_endpoint: oauth_authorization_server.authorization_endpoint,
      credential_endpoint: openid_credential_issuer.credential_endpoint,
      credential_issuer: openid_credential_issuer.credential_issuer,
      credential_configurations_supported: mapCredentialConfigurationsSupported(
        openid_credential_issuer
      ),
      keys: openid_credential_issuer.jwks.keys as JWK[],
      pushed_authorization_request_endpoint:
        oauth_authorization_server.pushed_authorization_request_endpoint,
      token_endpoint: oauth_authorization_server.token_endpoint,
      status_assertion_endpoint:
        openid_credential_issuer.status_attestation_endpoint,
      nonce_endpoint: openid_credential_issuer.nonce_endpoint!,
    };
  },
  { outputSchema: IssuerConfig } // Output validation for extra-safety
);

export const mapToRequestObject = createMapper<
  ParsedAuthorizeRequestResult,
  RequestObject
>(({ payload }) => ({
  iss: payload.iss ?? "UNKNOWN_ISSUER",
  client_id: payload.client_id,
  dcql_query: payload.dcql_query!,
  nonce: payload.nonce,
  response_uri: payload.response_uri!,
  state: payload.state,
}));
