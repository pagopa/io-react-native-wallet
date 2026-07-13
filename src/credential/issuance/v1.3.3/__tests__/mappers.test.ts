import type { MetadataResponseV1_3 } from "@pagopa/io-wallet-oid4vci";
import type { ParsedAuthorizeRequestResult } from "@pagopa/io-wallet-oid4vp";

import { mapToIssuerConfig, mapToRequestObject } from "../mappers";

describe("mapToIssuerConfig", () => {
  const issuerMetadataMock = {
    metadata: {
      federation_entity: {
        organization_name: "Issuer Example",
      },
      oauth_authorization_server: {
        authorization_endpoint: "https://issuer.example/authorize",
        jwks: {
          keys: [{ kid: "sig-kid-1", kty: "EC", use: "sig" }],
        },
        pushed_authorization_request_endpoint: "https://issuer.example/par",
        token_endpoint: "https://issuer.example/token",
      },
      openid_credential_issuer: {
        batch_credential_issuance: {
          batch_size: 10,
        },
        credential_configurations_supported: {
          MobileDrivingLicence: {
            credential_metadata: {
              display: [{ locale: "en", name: "Mobile Driving Licence" }],
            },
            doctype: "org.iso.18013.5.1.mDL",
            format: "mso_mdoc",
            scope: "MDL",
          },
          PersonIdentificationData: {
            credential_metadata: {
              claims: [
                {
                  display: [{ locale: "en", name: "Given name" }],
                  path: ["given_name"],
                },
                {
                  path: ["family_name"],
                },
              ],
              display: [{ locale: "en", name: "Person Identification Data" }],
            },
            format: "dc+sd-jwt",
            scope: "PID",
            vct: "eu.europa.ec.eudiw.pid.1",
          },
        },
        credential_endpoint: "https://issuer.example/credential",
        credential_issuer: "https://issuer.example",
        jwks: {
          keys: [{ kid: "sig-kid-2", kty: "EC", use: "sig" }],
        },
        nonce_endpoint: "https://issuer.example/nonce",
        status_attestation_endpoint: "https://issuer.example/status",
      },
    },
  } as unknown as MetadataResponseV1_3;

  it("maps Issuer metadata to IssuerConfig and normalizes credential claims", () => {
    expect(mapToIssuerConfig(issuerMetadataMock)).toEqual({
      authorization_endpoint: "https://issuer.example/authorize",
      credential_configurations_supported: {
        MobileDrivingLicence: {
          claims: [],
          display: [{ locale: "en", name: "Mobile Driving Licence" }],
          doctype: "org.iso.18013.5.1.mDL",
          format: "mso_mdoc",
          scope: "MDL",
        },
        PersonIdentificationData: {
          claims: [
            {
              display: [{ locale: "en", name: "Given name" }],
              path: ["given_name"],
            },
            {
              path: ["family_name"],
            },
          ],
          display: [{ locale: "en", name: "Person Identification Data" }],
          format: "dc+sd-jwt",
          scope: "PID",
          vct: "eu.europa.ec.eudiw.pid.1",
        },
      },
      credential_endpoint: "https://issuer.example/credential",
      credential_issuance_batch_size: 10,
      credential_issuer: "https://issuer.example",
      federation_entity: {
        organization_name: "Issuer Example",
      },
      keys: [
        { kid: "sig-kid-2", kty: "EC", use: "sig" },
        { kid: "sig-kid-1", kty: "EC", use: "sig" },
      ],
      nonce_endpoint: "https://issuer.example/nonce",
      pushed_authorization_request_endpoint: "https://issuer.example/par",
      token_endpoint: "https://issuer.example/token",
    });
  });

  it("throws when oauth_authorization_server is missing", () => {
    const input = {
      metadata: {
        ...issuerMetadataMock.metadata,
        oauth_authorization_server: undefined,
      },
    } as unknown as MetadataResponseV1_3;

    expect(() => mapToIssuerConfig(input)).toThrow(
      "oauth_authorization_server is required in Issuer metadata",
    );
  });

  it("throws when openid_credential_issuer is missing", () => {
    const input = {
      metadata: {
        ...issuerMetadataMock.metadata,
        openid_credential_issuer: undefined,
      },
    } as unknown as MetadataResponseV1_3;

    expect(() => mapToIssuerConfig(input)).toThrow(
      "openid_credential_issuer is required in Issuer metadata",
    );
  });
});

describe("mapToRequestObject", () => {
  it("maps parsed authorize request payload to RequestObject", () => {
    const input: ParsedAuthorizeRequestResult = {
      header: {
        alg: "alg",
        kid: "123",
        typ: "oauth-authz-req+jwt",
        x5c: ["cert1"],
      },
      payload: {
        client_id: "wallet-client-id",
        client_metadata: {
          jwks: {
            keys: [{ kid: "kid-1", kty: "EC", use: "enc" }],
          },
        } as ParsedAuthorizeRequestResult["payload"]["client_metadata"],
        dcql_query: { credentials: [{ id: "pid" }] },
        iss: "https://verifier.example",
        nonce: "nonce-123",
        response_mode: "direct_post.jwt",
        response_type: "vp_token",
        response_uri: "https://verifier.example/response",
        state: "state-123",
      },
    };

    expect(mapToRequestObject(input as any)).toEqual({
      client_id: "wallet-client-id",
      client_metadata: {
        jwks: {
          keys: [{ kid: "kid-1", kty: "EC", use: "enc" }],
        },
      },
      dcql_query: { credentials: [{ id: "pid" }] },
      iss: "https://verifier.example",
      nonce: "nonce-123",
      response_mode: "direct_post.jwt",
      response_type: "vp_token",
      response_uri: "https://verifier.example/response",
      state: "state-123",
      x5c: ["cert1"],
    });
  });
});
