import { InvalidRequestObjectError } from "../../common/errors";
import { verifyRequestObject } from "../05-verify-request-object";

jest.mock("react-native-quick-crypto", () => ({
  createHash: () => ({
    update: () => ({
      digest: jest
        .fn()
        .mockReturnValue("3ALTHlBmrN6Wc9oE3TxFZp47fET6iFBQIiwMJiu3BLcqw"),
    }),
  }),
}));

jest.mock("../../../../utils/callbacks", () => ({
  partialCallbacks: {
    verify: jest.fn().mockResolvedValue(true),
  },
}));

describe("verifyRequestObject", () => {
  const OID_FED_REQUEST_OBJECT =
    "eyJhbGciOiJFUzI1NiIsInR5cCI6Im9hdXRoLWF1dGh6LXJlcStqd3QiLCJraWQiOiIyMDE0ZGJhOC1jMjU2LTRhN2UtYWJjNC1kODcxMGRiNGZjMTciLCJ4NWMiOlsidGVzdC1jZXJ0aWZpY2F0ZSJdLCJ0cnVzdF9jaGFpbiI6WyJ0ZXN0LWVudGl0eS1zdGF0ZW1lbnQiXX0.eyJjbGllbnRfaWQiOiJvcGVuaWRfZmVkZXJhdGlvbjpodHRwczovL3JwLmV4YW1wbGUiLCJkY3FsX3F1ZXJ5Ijp7ImNyZWRlbnRpYWxzIjpbeyJpZCI6Ijk0MmYwZmU2LTIzYWItNDE3My05NzNmLTQ0NTE0NWU1NjM0ZSIsImZvcm1hdCI6ImRjK3NkLWp3dCIsIm1ldGEiOnsidmN0X3ZhbHVlcyI6WyJodHRwczovL3ByZS50YS53YWxsZXQuaXB6cy5pdC92Y3QvdjEuMC4wL3BlcnNvbmlkZW50aWZpY2F0aW9uZGF0YSJdfX1dfSwiaXNzIjoiaHR0cHM6Ly9ycC5leGFtcGxlIiwibm9uY2UiOiIwMjQyZmJjMTJjNWRhNzU4MGU3Yzg4MzQ0YTY0ODFlYjJlMjQ2NTY5YmNkMGI4NmVlZGVmMDJkZTc2YzFjYTAyIiwicmVxdWVzdF91cmlfbWV0aG9kIjoiZ2V0IiwicmVzcG9uc2VfbW9kZSI6ImRpcmVjdF9wb3N0Lmp3dCIsInJlc3BvbnNlX3R5cGUiOiJ2cF90b2tlbiIsInJlc3BvbnNlX3VyaSI6Imh0dHBzOi8vcnAuZXhhbXBsZS9hdXRoL3Jlc3BvbnNlIiwic3RhdGUiOiIxNmYwOGUwNy01YzI4LTQxNmMtYmVkNy0xMDIyZTVmNjk3NjkiLCJpYXQiOjE3NzY0MzU5NDYsImV4cCI6Mjc3NjQzOTU0Nn0.QILtci6g4GsYIKcN06JwYKHWDuvim6RoUEdoqyRmpHqo1TIXuhcSi1QHKsO8bK-PgfMv7mPHetJlFAETRAGiIQ";
  const X509_HASH_REQUEST_OBJECT =
    "eyJhbGciOiJFUzI1NiIsInR5cCI6Im9hdXRoLWF1dGh6LXJlcStqd3QiLCJraWQiOiIyMDE0ZGJhOC1jMjU2LTRhN2UtYWJjNC1kODcxMGRiNGZjMTciLCJ4NWMiOlsidGVzdC1jZXJ0aWZpY2F0ZSJdLCJ0cnVzdF9jaGFpbiI6WyJ0ZXN0LWVudGl0eS1zdGF0ZW1lbnQiXX0.eyJjbGllbnRfaWQiOiJ4NTA5X2hhc2g6M0FMVEhsQm1yTjZXYzlvRTNUeEZacDQ3ZkVUNmlGQlFJaXdNSml1M0JMY3F3IiwiZGNxbF9xdWVyeSI6eyJjcmVkZW50aWFscyI6W3siaWQiOiI5NDJmMGZlNi0yM2FiLTQxNzMtOTczZi00NDUxNDVlNTYzNGUiLCJmb3JtYXQiOiJkYytzZC1qd3QiLCJtZXRhIjp7InZjdF92YWx1ZXMiOlsiaHR0cHM6Ly9wcmUudGEud2FsbGV0LmlwenMuaXQvdmN0L3YxLjAuMC9wZXJzb25pZGVudGlmaWNhdGlvbmRhdGEiXX19XX0sImlzcyI6Imh0dHBzOi8vcnAuZXhhbXBsZSIsIm5vbmNlIjoiMDI0MmZiYzEyYzVkYTc1ODBlN2M4ODM0NGE2NDgxZWIyZTI0NjU2OWJjZDBiODZlZWRlZjAyZGU3NmMxY2EwMiIsInJlcXVlc3RfdXJpX21ldGhvZCI6ImdldCIsInJlc3BvbnNlX21vZGUiOiJkaXJlY3RfcG9zdC5qd3QiLCJyZXNwb25zZV90eXBlIjoidnBfdG9rZW4iLCJyZXNwb25zZV91cmkiOiJodHRwczovL3JwLmV4YW1wbGUvYXV0aC9yZXNwb25zZSIsInN0YXRlIjoiMTZmMDhlMDctNWMyOC00MTZjLWJlZDctMTAyMmU1ZjY5NzY5IiwiaWF0IjoxNzc2NDM1OTQ2LCJleHAiOjI3NzY0Mzk1NDZ9.mN4AY2gaNTNOojEHkuEeSyXPX77ftB6nA3oj7OnQhcuAz1A_1Vjwu2yZk9OLARK-yS5VSSXd7HR2uVHbfup7yg";

  const CLIENT_ID_ERROR = new InvalidRequestObjectError(
    "Client ID does not match Request Object or Entity Configuration"
  );

  it("should throw error when the client ID does not match the Request Object or Entity Configuration (openid_federation prefix)", async () => {
    await expect(() =>
      verifyRequestObject(OID_FED_REQUEST_OBJECT, {
        state: "abcd",
        clientId: "openid_federation:https://wrong-rp.example",
        rpConf: {
          subject: "https://wrong-rp-2.example",
          federation_entity: {},
          jwks: { keys: [] },
        },
      })
    ).rejects.toThrow(CLIENT_ID_ERROR);
  });

  it("should throw error when the client ID does not match the Request Object or Entity Configuration (no prefix)", async () => {
    await expect(() =>
      verifyRequestObject(OID_FED_REQUEST_OBJECT, {
        state: "abcd",
        clientId: "https://wrong-rp.example",
        rpConf: {
          subject: "https://wrong-rp-2.example",
          federation_entity: {},
          jwks: { keys: [] },
        },
      })
    ).rejects.toThrow(CLIENT_ID_ERROR);
  });

  it("should throw error when the x509 hash does not match the hash of the x5c leaf certificate", async () => {
    await expect(() =>
      verifyRequestObject(X509_HASH_REQUEST_OBJECT, {
        state: "abcd",
        clientId: "x509_hash:wrong_hash",
      })
    ).rejects.toThrow(
      new InvalidRequestObjectError(
        "x509_hash does not match the hash of the x5c leaf certificate"
      )
    );
  });

  it("should return the Request Object when the client is valid (x509_hash prefix)", async () => {
    const result = await verifyRequestObject(X509_HASH_REQUEST_OBJECT, {
      state: "abcd",
      clientId: "x509_hash:3ALTHlBmrN6Wc9oE3TxFZp47fET6iFBQIiwMJiu3BLcqw",
    });

    expect(result).toEqual({
      requestObject: {
        client_id: "x509_hash:3ALTHlBmrN6Wc9oE3TxFZp47fET6iFBQIiwMJiu3BLcqw",
        dcql_query: {
          credentials: [
            {
              id: "942f0fe6-23ab-4173-973f-445145e5634e",
              format: "dc+sd-jwt",
              meta: {
                vct_values: [
                  "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
                ],
              },
            },
          ],
        },
        iss: "https://rp.example",
        nonce:
          "0242fbc12c5da7580e7c88344a6481eb2e246569bcd0b86eedef02de76c1ca02",
        response_mode: "direct_post.jwt",
        response_type: "vp_token",
        response_uri: "https://rp.example/auth/response",
        state: "16f08e07-5c28-416c-bed7-1022e5f69769",
        x5c: ["test-certificate"],
        trust_chain: ["test-entity-statement"],
        client_metadata: undefined,
      },
    });
  });

  it("should return the Request Object when the client is valid (openid_federation prefix)", async () => {
    const result = await verifyRequestObject(OID_FED_REQUEST_OBJECT, {
      state: "abcd",
      clientId: "openid_federation:https://rp.example",
      rpConf: {
        subject: "https://rp.example",
        federation_entity: {},
        jwks: { keys: [] },
      },
    });

    expect(result).toEqual({
      requestObject: {
        client_id: "openid_federation:https://rp.example",
        dcql_query: {
          credentials: [
            {
              id: "942f0fe6-23ab-4173-973f-445145e5634e",
              format: "dc+sd-jwt",
              meta: {
                vct_values: [
                  "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
                ],
              },
            },
          ],
        },
        iss: "https://rp.example",
        nonce:
          "0242fbc12c5da7580e7c88344a6481eb2e246569bcd0b86eedef02de76c1ca02",
        response_mode: "direct_post.jwt",
        response_type: "vp_token",
        response_uri: "https://rp.example/auth/response",
        state: "16f08e07-5c28-416c-bed7-1022e5f69769",
        x5c: ["test-certificate"],
        trust_chain: ["test-entity-statement"],
        client_metadata: undefined,
      },
    });
  });
});
