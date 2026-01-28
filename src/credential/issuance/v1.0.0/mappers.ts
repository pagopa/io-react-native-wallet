import type { IssuerConfig } from "../api/IssuerConfig";
import { CredentialIssuerEntityConfiguration } from "../../../trust/v1.0.0/types";
import { createMapper } from "../../../utils/mappers";

export const mapToIssuerConfig = createMapper<
  CredentialIssuerEntityConfiguration,
  IssuerConfig
>((x) => {
  const { oauth_authorization_server, openid_credential_issuer } =
    x.payload.metadata;
  return {
    authorization_endpoint: oauth_authorization_server.authorization_endpoint,
    credential_endpoint: openid_credential_issuer.credential_endpoint,
    credential_issuer: openid_credential_issuer.credential_issuer,
    credential_configurations_supported:
      openid_credential_issuer.credential_configurations_supported,
    keys: openid_credential_issuer.jwks.keys,
    pushed_authorization_request_endpoint:
      oauth_authorization_server.pushed_authorization_request_endpoint,
    token_endpoint: oauth_authorization_server.token_endpoint,
    status_assertion_endpoint:
      openid_credential_issuer.status_attestation_endpoint,
    nonce_endpoint: openid_credential_issuer.nonce_endpoint,
  };
});
