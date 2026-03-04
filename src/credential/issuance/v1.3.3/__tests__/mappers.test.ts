import type { MetadataResponse } from "@pagopa/io-wallet-oid4vci";
import type { ParsedAuthorizeRequestResult } from "@pagopa/io-wallet-oid4vp";
import { mapToIssuerConfig, mapToRequestObject } from "../mappers";

describe("mapToIssuerConfig", () => {
  const issuerMetadataMock = {
    metadata: {
      oauth_authorization_server: {
        authorization_endpoint: "https://issuer.example/authorize",
        pushed_authorization_request_endpoint: "https://issuer.example/par",
        token_endpoint: "https://issuer.example/token",
      },
      openid_credential_issuer: {
        credential_endpoint: "https://issuer.example/credential",
        credential_issuer: "https://issuer.example",
        status_attestation_endpoint: "https://issuer.example/status",
        nonce_endpoint: "https://issuer.example/nonce",
        jwks: {
          keys: [{ kty: "EC", kid: "sig-kid", use: "sig" }],
        },
        credential_configurations_supported: {
          PersonIdentificationData: {
            format: "dc+sd-jwt",
            vct: "eu.europa.ec.eudiw.pid.1",
            scope: "PID",
            credential_metadata: {
              display: [{ name: "Person Identification Data", locale: "en" }],
              claims: [
                {
                  path: ["given_name"],
                  display: [{ name: "Given name", locale: "en" }],
                },
                {
                  path: ["family_name"],
                },
              ],
            },
          },
          MobileDrivingLicence: {
            format: "mso_mdoc",
            doctype: "org.iso.18013.5.1.mDL",
            scope: "MDL",
            credential_metadata: {
              display: [{ name: "Mobile Driving Licence", locale: "en" }],
            },
          },
        },
      },
      federation_entity: {
        organization_name: "Issuer Example",
      },
    },
  } as unknown as MetadataResponse;

  it("maps Issuer metadata to IssuerConfig and normalizes credential claims", () => {
    expect(mapToIssuerConfig(issuerMetadataMock)).toEqual({
      authorization_endpoint: "https://issuer.example/authorize",
      credential_endpoint: "https://issuer.example/credential",
      credential_issuer: "https://issuer.example",
      credential_configurations_supported: {
        PersonIdentificationData: {
          format: "dc+sd-jwt",
          vct: "eu.europa.ec.eudiw.pid.1",
          scope: "PID",
          display: [{ name: "Person Identification Data", locale: "en" }],
          claims: [
            {
              path: ["given_name"],
              display: [{ name: "Given name", locale: "en" }],
            },
            {
              path: ["family_name"],
              display: [],
            },
          ],
        },
        MobileDrivingLicence: {
          format: "mso_mdoc",
          doctype: "org.iso.18013.5.1.mDL",
          scope: "MDL",
          display: [{ name: "Mobile Driving Licence", locale: "en" }],
          claims: [],
        },
      },
      keys: [{ kty: "EC", kid: "sig-kid", use: "sig" }],
      pushed_authorization_request_endpoint: "https://issuer.example/par",
      token_endpoint: "https://issuer.example/token",
      status_assertion_endpoint: "https://issuer.example/status",
      nonce_endpoint: "https://issuer.example/nonce",
      federation_entity: {
        organization_name: "Issuer Example",
      },
    });
  });

  it("throws when oauth_authorization_server is missing", () => {
    const input = {
      metadata: {
        ...issuerMetadataMock.metadata,
        oauth_authorization_server: undefined,
      },
    } as unknown as MetadataResponse;

    expect(() => mapToIssuerConfig(input)).toThrow(
      "oauth_authorization_server is required in Issuer metadata"
    );
  });

  it("throws when openid_credential_issuer is missing", () => {
    const input = {
      metadata: {
        ...issuerMetadataMock.metadata,
        openid_credential_issuer: undefined,
      },
    } as unknown as MetadataResponse;

    expect(() => mapToIssuerConfig(input)).toThrow(
      "openid_credential_issuer is required in Issuer metadata"
    );
  });
});

describe("mapToRequestObject", () => {
  it("maps parsed authorize request payload to RequestObject", () => {
    const input: ParsedAuthorizeRequestResult = {
      header: {
        alg: "alg",
        typ: "oauth-authz-req+jwt",
      },
      payload: {
        response_mode: "direct_post.jwt",
        response_type: "vp_token",
        iss: "https://verifier.example",
        client_id: "wallet-client-id",
        dcql_query: { credentials: [{ id: "pid" }] },
        nonce: "nonce-123",
        response_uri: "https://verifier.example/response",
        state: "state-123",
      },
    };

    expect(mapToRequestObject(input as any)).toEqual({
      iss: "https://verifier.example",
      client_id: "wallet-client-id",
      dcql_query: { credentials: [{ id: "pid" }] },
      nonce: "nonce-123",
      response_uri: "https://verifier.example/response",
      state: "state-123",
      response_mode: "direct_post.jwt",
      response_type: "vp_token",
    });
  });
});
