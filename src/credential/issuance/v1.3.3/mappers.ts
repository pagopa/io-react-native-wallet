import type { MetadataResponseV1_3 } from "@pagopa/io-wallet-oid4vci";
import type { ParsedAuthorizeRequestResult } from "@pagopa/io-wallet-oid4vp";

import type { RequestObject } from "../../../credential/presentation";
import type { JWK } from "../../../utils/jwk";

import { createMapper } from "../../../utils/mappers";
import { assert } from "../../../utils/misc";
import { IssuerConfig } from "../api/IssuerConfig";

type CredentialConfigurations =
  IssuerConfig["credential_configurations_supported"];
type OpenIdCredentialIssuer =
  MetadataResponseV1_3["metadata"]["openid_credential_issuer"];

const mapCredentialConfigurationsSupported = (
  oidIssuer: NonNullable<OpenIdCredentialIssuer>,
): CredentialConfigurations =>
  Object.entries(oidIssuer.credential_configurations_supported).reduce(
    (acc, [key, config]) => {
      acc[key] = {
        ...(config.format === "dc+sd-jwt"
          ? { format: config.format, vct: config.vct }
          : { doctype: config.doctype, format: config.format }),
        claims:
          config.credential_metadata.claims?.map((claim) => ({
            display: claim.display,
            path: claim.path,
          })) ?? [],
        display: config.credential_metadata.display!,
        scope: config.scope,
      };
      return acc;
    },
    {} as CredentialConfigurations,
  );

export const mapToIssuerConfig = createMapper<
  MetadataResponseV1_3,
  IssuerConfig
>(
  (x) => {
    const {
      federation_entity,
      oauth_authorization_server,
      openid_credential_issuer,
      openid_credential_verifier,
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
      "oauth_authorization_server is required in Issuer metadata",
    );
    assert(
      openid_credential_issuer,
      "openid_credential_issuer is required in Issuer metadata",
    );

    return {
      authorization_endpoint: oauthAuthorizationServer.authorization_endpoint,
      authorization_servers: openid_credential_issuer.authorization_servers,
      credential_configurations_supported: mapCredentialConfigurationsSupported(
        openid_credential_issuer,
      ),
      credential_endpoint: openid_credential_issuer.credential_endpoint,
      credential_issuance_batch_size:
        openid_credential_issuer.batch_credential_issuance?.batch_size,
      credential_issuer: openid_credential_issuer.credential_issuer,
      encrypted_response_enc_values_supported:
        openid_credential_verifier?.encrypted_response_enc_values_supported,
      federation_entity: federation_entity ?? {},
      keys: [
        ...openid_credential_issuer.jwks.keys,
        ...oauthAuthorizationServer.jwks.keys,
      ] as JWK[],
      nonce_endpoint: openid_credential_issuer.nonce_endpoint ?? "",
      pushed_authorization_request_endpoint:
        oauthAuthorizationServer.pushed_authorization_request_endpoint,
      token_endpoint: oauthAuthorizationServer.token_endpoint,
    };
  },
  { outputSchema: IssuerConfig }, // Output validation for extra-safety
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
