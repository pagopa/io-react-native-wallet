import { fetchPresentDefinition } from "../06-fetch-presentation-definition";
import { PresentationDefinition, RequestObject } from "../types";
import { RelyingPartyEntityConfiguration } from "../../../entity/trust/types";

describe("fetchPresentDefinition", () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    // Save the original fetch so we can restore it later
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    // Replace global.fetch with a Jest mock
    global.fetch = jest.fn();
  });

  afterAll(() => {
    // Restore the original fetch after all tests
    global.fetch = originalFetch;
  });

  it("returns the presentationDefinition from the request object if present", async () => {
    const mockRequestObject = {
      presentation_definition: {
        id: "test-direct",
      } as unknown as PresentationDefinition,
    } as unknown as RequestObject;

    const result = await fetchPresentDefinition(mockRequestObject);

    expect(result.presentationDefinition.id).toBe("test-direct");
  });

  it("returns the presentationDefinition from the request object more detailed", async () => {
    const mockRequestObject = {
      response_type: "vp_token",
      client_id_scheme: "x509_san_dns",
      client_id: "funke.animo.id",
      response_uri:
        "https://funke.animo.id/siop/01936901-2390-722e-b9f1-bf42db4db7ca/authorize",
      response_mode: "direct_post.jwt",
      nonce: "711705125142502475667920",
      state: "910100005298105798512696",
      client_metadata: {
        jwks: {
          keys: [
            {
              use: "enc",
              kty: "EC",
              crv: "P-256",
              x: "a_QlmOmj_4-b2D6JsY8mAzW5lggXHt5m_1XMK7vbLW8",
              y: "YdYoPKmWwCfZcEz1kBLVImrlzIY5BYnBge62vJ8cVq0",
              kid: "zDnaepvgxwAbGk6ecF2kxJejmXjNVzXyu8rntBxeXZGAYtsPc",
            },
          ],
        },
        authorization_encrypted_response_alg: "ECDH-ES",
        authorization_encrypted_response_enc: "A256GCM",
        logo_uri: "https://funke.animo.id/assets/verifiers/redcare.png",
        client_name: "Redcare Pharmacy",
        client_id: "funke.animo.id",
        passBy: "VALUE",
        response_types_supported: ["vp_token"],
        subject_syntax_types_supported: [
          "urn:ietf:params:oauth:jwk-thumbprint",
          "did:web",
          "did:key",
          "did:jwk",
        ],
        vp_formats: {
          mso_mdoc: {
            alg: ["EdDSA", "ES256", "ES256K"],
          },
          jwt_vc: {
            alg: ["EdDSA", "ES256", "ES256K"],
          },
          jwt_vc_json: {
            alg: ["EdDSA", "ES256", "ES256K"],
          },
          jwt_vp_json: {
            alg: ["EdDSA", "ES256", "ES256K"],
          },
          jwt_vp: {
            alg: ["EdDSA", "ES256", "ES256K"],
          },
          ldp_vc: {
            proof_type: ["Ed25519Signature2018", "Ed25519Signature2020"],
          },
          ldp_vp: {
            proof_type: ["Ed25519Signature2018", "Ed25519Signature2020"],
          },
          "vc+sd-jwt": {
            "kb-jwt_alg_values": ["EdDSA", "ES256", "ES256K"],
            "sd-jwt_alg_values": ["EdDSA", "ES256", "ES256K"],
          },
        },
      },
      presentation_definition: {
        id: "01936901-3823-766e-b771-301158d79a60",
        name: "Receive your prescription (sd-jwt vc)",
        purpose:
          "To receive your prescription and finalize the transaction, we require the following attributes",
        input_descriptors: [
          {
            id: "6450857c-7f4f-4441-af85-543e9b6194fa",
            format: {
              "vc+sd-jwt": {
                "sd-jwt_alg_values": ["ES256"],
                "kb-jwt_alg_values": ["ES256"],
              },
            },
            constraints: {
              limit_disclosure: "required",
              fields: [
                {
                  path: ["$.health_insurance_id"],
                },
                {
                  path: ["$.affiliation_country"],
                },
                {
                  path: ["$.vct"],
                  filter: {
                    type: "string",
                    enum: ["https://example.eudi.ec.europa.eu/hiid/1"],
                  },
                },
              ],
            },
          },
        ],
      },
      iss: "https://funke.animo.id/siop/01936901-2390-722e-b9f1-bf42db4db7ca/authorize",
      aud: "https://self-issued.me/v2",
      exp: 1738639682,
      nbf: 1738639562,
      iat: 1738639562,
      jti: "837931fd-4318-4cdc-8e01-68daf349c25c",
    } as RequestObject;

    const result = await fetchPresentDefinition(mockRequestObject);

    expect(result.presentationDefinition.id).toBe(
      "01936901-3823-766e-b771-301158d79a60"
    );
  });

  it("fetches the presentationDefinition from the provided URI if present", async () => {
    // Mock a valid response from the fetch call
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "test-fetched",
        input_descriptors: [{ id: "id", constraints: {} }],
      }),
    } as Response);

    const mockRequestObject = {} as unknown as RequestObject;

    const mockRpConf = {
      wallet_relying_party: {
        presentation_definition_uri:
          "https://example.com/presentation-definition.json",
      },
    } as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"];

    const result = await fetchPresentDefinition(
      mockRequestObject,
      {},
      mockRpConf
    );

    // Ensure the fetch was called with the correct URI
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/presentation-definition.json",
      { method: "GET" }
    );
    expect(result.presentationDefinition.id).toBe("test-fetched");
  });

  it("throws an error when fetch fails for the provided URI", async () => {
    // Mock a failed response
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const mockRequestObject = {} as unknown as RequestObject;

    const mockRpConf = {
      wallet_relying_party: {
        presentation_definition_uri:
          "https://example.com/presentation-definition.json",
      },
    } as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"];

    await expect(
      fetchPresentDefinition(mockRequestObject, {}, mockRpConf)
    ).rejects.toThrow();
  });

  it("returns the pre-configured presentationDefinition if 'scope' exists and no URI is provided", async () => {
    const mockRequestObject = {
      scope: "openid",
    } as unknown as RequestObject;

    const mockRpConf: RelyingPartyEntityConfiguration["payload"]["metadata"] = {
      wallet_relying_party: {
        presentation_definition: {
          id: "test-preconfigured",
        } as unknown as PresentationDefinition,
      },
    } as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"];

    const result = await fetchPresentDefinition(
      mockRequestObject,
      {},
      mockRpConf
    );

    expect(result.presentationDefinition.id).toBe("test-preconfigured");
  });

  it("throws an error if no presentation definition can be found", async () => {
    const mockRequestObject = {} as unknown as RequestObject;

    await expect(fetchPresentDefinition(mockRequestObject)).rejects.toThrow(
      "Presentation definition not found"
    );
  });
});
