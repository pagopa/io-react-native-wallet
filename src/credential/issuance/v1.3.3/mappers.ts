import type { MetadataResponseV1_3 } from "@pagopa/io-wallet-oid4vci";
import type { ParsedAuthorizeRequestResult } from "@pagopa/io-wallet-oid4vp";
import { assert } from "../../../utils/misc";
import { createMapper } from "../../../utils/mappers";
import type { JWK } from "../../../utils/jwk";
import type { RequestObject } from "../../../credential/presentation";
import { IssuerConfig } from "../api/IssuerConfig";

type CredentialConfigurations =
  IssuerConfig["credential_configurations_supported"];
type OpenIdCredentialIssuer =
  MetadataResponseV1_3["metadata"]["openid_credential_issuer"];

const mapCredentialConfigurationsSupported = (
  oidIssuer: NonNullable<OpenIdCredentialIssuer>
): CredentialConfigurations =>
  Object.entries(oidIssuer.credential_configurations_supported).reduce(
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

export const mapToIssuerConfig = createMapper<
  MetadataResponseV1_3,
  IssuerConfig
>(
  (x) => {
    const {
      oauth_authorization_server,
      openid_credential_issuer,
      openid_credential_verifier,
      federation_entity,
    } = x.metadata;

    // The Issuer's own `oauth_authorization_server` always describes the Issuer
    // itself. When a credential offer selected a *different* Authorization
    // Server, its metadata is surfaced separately through that server's
    // federation claims, and the Authorization Server endpoints must be taken
    // from there. Fall back to the Issuer's own server otherwise.
    const oauthAuthorizationServer =
      x.authorization_server_federation_claims?.metadata
        ?.oauth_authorization_server ?? oauth_authorization_server;

    assert(
      oauthAuthorizationServer,
      "oauth_authorization_server is required in Issuer metadata"
    );
    assert(
      openid_credential_issuer,
      "openid_credential_issuer is required in Issuer metadata"
    );

    return {
      authorization_endpoint: oauthAuthorizationServer.authorization_endpoint,
      credential_endpoint: openid_credential_issuer.credential_endpoint,
      credential_issuer: openid_credential_issuer.credential_issuer,
      authorization_servers: openid_credential_issuer.authorization_servers,
      credential_configurations_supported: mapCredentialConfigurationsSupported(
        openid_credential_issuer
      ),
      keys: [
        ...openid_credential_issuer.jwks.keys,
        ...oauthAuthorizationServer.jwks.keys,
      ] as JWK[],
      pushed_authorization_request_endpoint:
        oauthAuthorizationServer.pushed_authorization_request_endpoint,
      token_endpoint: oauthAuthorizationServer.token_endpoint,
      nonce_endpoint: openid_credential_issuer.nonce_endpoint ?? "",
      federation_entity: federation_entity ?? {},
      credential_issuance_batch_size:
        openid_credential_issuer.batch_credential_issuance?.batch_size,
      encrypted_response_enc_values_supported:
        openid_credential_verifier?.encrypted_response_enc_values_supported,
    };
  },
  { outputSchema: IssuerConfig } // Output validation for extra-safety
);

export const mapToRequestObject = createMapper<
  ParsedAuthorizeRequestResult,
  RequestObject
>(({ header, payload }) => ({
  ...payload,
  iss: payload.iss ?? "",
  trust_chain: header.trust_chain,
  x5c: header.x5c as string[] | undefined,
}));
