import { RelyingPartyEntityConfiguration } from "../../trust/types";
import * as RelyingPartySolution from "..";
import { AuthRequestDecodeError } from "../../utils/errors";

describe("decodeAuthRequestQR", () => {
  it("should return authentication request URL", async () => {
    const qrcode =
      "ZXVkaXc6Ly9hdXRob3JpemU/Y2xpZW50X2lkPWh0dHBzOi8vdmVyaWZpZXIuZXhhbXBsZS5vcmcmcmVxdWVzdF91cmk9aHR0cHM6Ly92ZXJpZmllci5leGFtcGxlLm9yZy9yZXF1ZXN0X3VyaQ==";
    const result = RelyingPartySolution.decodeAuthRequestQR(qrcode);
    expect(result.requestURI).toEqual(
      "https://verifier.example.org/request_uri"
    );
  });
  it("should throw exception with invalid QR", async () => {
    const qrcode = "aHR0cDovL2dvb2dsZS5pdA==";
    expect(() => RelyingPartySolution.decodeAuthRequestQR(qrcode)).toThrowError(
      AuthRequestDecodeError
    );
  });
});

describe("RpEntityConfiguration", () => {
  it("should parse a valid conf", async () => {
    const pp = {
      header: {
        alg: "RS256",
        kid: "9Cquk0X-fNPSdePQIgQcQZtD6J0IjIRrFigW2PPK_-w",
        typ: "entity-statement+jwt",
      },
      payload: {
        exp: 1692625747,
        iat: 1692625387,
        iss: "https://demo.proxy.eudi.wallet.developers.italia.it/OpenID4VP",
        sub: "https://demo.proxy.eudi.wallet.developers.italia.it/OpenID4VP",
        jwks: {
          keys: [
            {
              kty: "RSA",
              kid: "9Cquk0X-fNPSdePQIgQcQZtD6J0IjIRrFigW2PPK_-w",
              e: "AQAB",
              n: "utqtxbs-jnK0cPsV7aRkkZKA9t4S-WSZa3nCZtYIKDpgLnR_qcpeF0diJZvKOqXmj2cXaKFUE-8uHKAHo7BL7T-Rj2x3vGESh7SG1pE0thDGlXj4yNsg0qNvCXtk703L2H3i1UXwx6nq1uFxD2EcOE4a6qDYBI16Zl71TUZktJwmOejoHl16CPWqDLGo9GUSk_MmHOV20m4wXWkB4qbvpWVY8H6b2a0rB1B1YPOs5ZLYarSYZgjDEg6DMtZ4NgiwZ-4N1aaLwyO-GLwt9Vf-NBKwoxeRyD3zWE2FXRFBbhKGksMrCGnFDsNl5JTlPjaM3kYyImE941ggcuc495m-Fw",
            },
          ],
        },
        metadata: {
          federation_entity: {
            organization_name: "wallet-provider",
            homepage_uri: "https://wallet-provider.example",
            policy_uri: "https://wallet-provider.example",
            logo_uri: "https://wallet-provider.example",
            contacts: ["https://wallet-provider.example"],
          },
          wallet_relying_party: {
            application_type: "web",
            authorization_encrypted_response_alg: [
              "RSA-OAEP",
              "RSA-OAEP-256",
              "ECDH-ES",
              "ECDH-ES+A128KW",
              "ECDH-ES+A192KW",
              "ECDH-ES+A256KW",
            ],
            authorization_encrypted_response_enc: [
              "A128CBC-HS256",
              "A192CBC-HS384",
              "A256CBC-HS512",
              "A128GCM",
              "A192GCM",
              "A256GCM",
            ],
            authorization_signed_response_alg: [
              "RS256",
              "RS384",
              "RS512",
              "ES256",
              "ES384",
              "ES512",
            ],
            client_id:
              "https://demo.proxy.eudi.wallet.developers.italia.it/OpenID4VP",
            client_name: "Name of an example organization",
            contacts: ["ops@verifier.example.org"],
            default_acr_values: [
              "https://www.spid.gov.it/SpidL2",
              "https://www.spid.gov.it/SpidL3",
            ],
            default_max_age: 1111,
            id_token_encrypted_response_alg: [
              "RSA-OAEP",
              "RSA-OAEP-256",
              "ECDH-ES",
              "ECDH-ES+A128KW",
              "ECDH-ES+A192KW",
              "ECDH-ES+A256KW",
            ],
            id_token_encrypted_response_enc: [
              "A128CBC-HS256",
              "A192CBC-HS384",
              "A256CBC-HS512",
              "A128GCM",
              "A192GCM",
              "A256GCM",
            ],
            id_token_signed_response_alg: [
              "RS256",
              "RS384",
              "RS512",
              "ES256",
              "ES384",
              "ES512",
            ],
            presentation_definitions: [
              {
                id: "pid-sd-jwt:unique_id+given_name+family_name",
                input_descriptors: [
                  {
                    id: "pid-sd-jwt:unique_id+given_name+family_name",
                    format: {
                      constraints: {
                        fields: [
                          {
                            filter: {
                              const: "PersonIdentificationData",
                              type: "string",
                            },
                            path: ["$.sd-jwt.type"],
                          },
                          {
                            filter: {
                              type: "object",
                            },
                            path: ["$.sd-jwt.cnf"],
                          },
                          {
                            intent_to_retain: "true",
                            path: ["$.sd-jwt.family_name"],
                          },
                          {
                            intent_to_retain: "true",
                            path: ["$.sd-jwt.given_name"],
                          },
                          {
                            intent_to_retain: "true",
                            path: ["$.sd-jwt.unique_id"],
                          },
                        ],
                        limit_disclosure: "required",
                      },
                      jwt: {
                        alg: ["EdDSA", "ES256"],
                      },
                    },
                  },
                ],
              },
              {
                id: "mDL-sample-req",
                input_descriptors: [
                  {
                    format: {
                      constraints: {
                        fields: [
                          {
                            filter: {
                              const: "org.iso.18013.5.1.mDL",
                              type: "string",
                            },
                            path: ["$.mdoc.doctype"],
                          },
                          {
                            filter: {
                              const: "org.iso.18013.5.1",
                              type: "string",
                            },
                            path: ["$.mdoc.namespace"],
                          },
                          {
                            intent_to_retain: "false",
                            path: ["$.mdoc.family_name"],
                          },
                          {
                            intent_to_retain: "false",
                            path: ["$.mdoc.portrait"],
                          },
                          {
                            intent_to_retain: "false",
                            path: ["$.mdoc.driving_privileges"],
                          },
                        ],
                        limit_disclosure: "required",
                      },
                      mso_mdoc: {
                        alg: ["EdDSA", "ES256"],
                      },
                    },
                    id: "mDL",
                  },
                ],
              },
            ],
            redirect_uris: [
              "https://demo.proxy.eudi.wallet.developers.italia.it/OpenID4VP/redirect-uri",
            ],
            request_uris: [
              "https://demo.proxy.eudi.wallet.developers.italia.it/OpenID4VP/request-uri",
            ],
            require_auth_time: true,
            subject_type: "pairwise",
            vp_formats: {
              jwt_vp_json: {
                alg: ["EdDSA", "ES256K"],
              },
            },
            jwks: {
              keys: [
                {
                  crv: "P-256",
                  d: "KzQBowMMoPmSZe7G8QsdEWc1IvR2nsgE8qTOYmMcLtc",
                  kid: "dDwPWXz5sCtczj7CJbqgPGJ2qQ83gZ9Sfs-tJyULi6s",
                  use: "sig",
                  kty: "EC",
                  x: "TSO-KOqdnUj5SUuasdlRB2VVFSqtJOxuR5GftUTuBdk",
                  y: "ByWgQt1wGBSnF56jQqLdoO1xKUynMY-BHIDB3eXlR7",
                },
                {
                  kty: "RSA",
                  d: "QUZsh1NqvpueootsdSjFQz-BUvxwd3Qnzm5qNb-WeOsvt3rWMEv0Q8CZrla2tndHTJhwioo1U4NuQey7znijhZ177bUwPPxSW1r68dEnL2U74nKwwoYeeMdEXnUfZSPxzs7nY6b7vtyCoA-AjiVYFOlgKNAItspv1HxeyGCLhLYhKvS_YoTdAeLuegETU5D6K1xGQIuw0nS13Icjz79Y8jC10TX4FdZwdX-NmuIEDP5-s95V9DMENtVqJAVE3L-wO-NdDilyjyOmAbntgsCzYVGH9U3W_djh4t3qVFCv3r0S-DA2FD3THvlrFi655L0QHR3gu_Fbj3b9Ybtajpue_Q",
                  e: "AQAB",
                  use: "enc",
                  kid: "9Cquk0X-fNPSdePQIgQcQZtD6J0IjIRrFigW2PPK_-w",
                  n: "utqtxbs-jnK0cPsV7aRkkZKA9t4S-WSZa3nCZtYIKDpgLnR_qcpeF0diJZvKOqXmj2cXaKFUE-8uHKAHo7BL7T-Rj2x3vGESh7SG1pE0thDGlXj4yNsg0qNvCXtk703L2H3i1UXwx6nq1uFxD2EcOE4a6qDYBI16Zl71TUZktJwmOejoHl16CPWqDLGo9GUSk_MmHOV20m4wXWkB4qbvpWVY8H6b2a0rB1B1YPOs5ZLYarSYZgjDEg6DMtZ4NgiwZ-4N1aaLwyO-GLwt9Vf-NBKwoxeRyD3zWE2FXRFBbhKGksMrCGnFDsNl5JTlPjaM3kYyImE941ggcuc495m-Fw",
                  p: "2zmGXIMCEHPphw778YjVTar1eycih6fFSJ4I4bl1iq167GqO0PjlOx6CZ1-OdBTVU7HfrYRiUK_BnGRdPDn-DQghwwkB79ZdHWL14wXnpB5y-boHz_LxvjsEqXtuQYcIkidOGaMG68XNT1nM4F9a8UKFr5hHYT5_UIQSwsxlRQ0",
                  q: "2jMFt2iFrdaYabdXuB4QMboVjPvbLA-IVb6_0hSG_-EueGBvgcBxdFGIZaG6kqHqlB7qMsSzdptU0vn6IgmCZnX-Hlt6c5X7JB_q91PZMLTO01pbZ2Bk58GloalCHnw_mjPh0YPviH5jGoWM5RHyl_HDDMI-UeLkzP7ImxGizrM",
                },
              ],
            },
          },
        },
        authority_hints: [
          "https://demo.federation.eudi.wallet.developers.italia.it",
        ],
      },
    };
    const result = RelyingPartyEntityConfiguration.safeParse(pp);
    if (result.success === false) {
      throw result.error;
    }
    expect(result.success).toBe(true);
  });
});
