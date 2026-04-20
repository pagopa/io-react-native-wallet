import * as jwtModule from "@pagopa/io-react-native-jwt";
import { IoWalletError } from "../../../../utils/errors";
import { InvalidRequestObjectError } from "../../common/errors";
import { verifyRequestObject } from "../05-verify-request-object";
import type { RelyingPartyConfig } from "../../api/RelyingPartyConfig";
import type { RequestObject } from "../../api/types";

const CLIENT_ID = "https://relying_party.rp";
const VERIFY_RESULT_MOCK = { payload: {}, protectedHeader: {} };

const requestObjectJwt =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6Im9hdXRoLWF1dGh6LXJlcStqd3QiLCJraWQiOiJlNDZhNGJmOC1hODRhLTQ3ZDYtYmY4ZS1hYjBhNDBmZjJkNGIifQ.eyJjbGllbnRfaWQiOiJodHRwczovL3JlbHlpbmdfcGFydHkucnAiLCJpc3MiOiJodHRwczovL3JlbHlpbmdfcGFydHkucnAiLCJyZXNwb25zZV9tb2RlIjoiZGlyZWN0X3Bvc3Quand0Iiwic3RhdGUiOiJhYmMiLCJyZXNwb25zZV90eXBlIjoidnBfdG9rZW4iLCJub25jZSI6IjEyMyIsInJlc3BvbnNlX3VyaSI6Imh0dHBzOi8vcmVseWluZ19wYXJ0eS5ycC9yZXNwb25zZV91cmkiLCJpYXQiOjE3NDU5MjM5MjMsImV4cCI6MTc2NTkzMzkyMywiZGNxbF9xdWVyeSI6e319.fhP8oX_tAH9viy4Tlp8E1XxGBgTDQA_WsDy8yUOcwE_k0nNJfQuFuOOmbSmoFD4IpU_jGVSkgSdTXNYcseZIc5KloetZ2W4pL_leJgwwErivBRNRKwmTdm0YCkvzCIZTcv-rv9UK4CwcYm2XhIJ8XOglN5LbLD1zZqEQucvRyTJI79W04e9zzwDV9dWRIMgBHT8kiapfL5iyS_cApbStIGMpwA4OzxXXdAViS-Klf8n90RpTQdKGveLizBY298jTWtxgfjwaaA8HsvyfovHrkG56i-dW6jSBJNPvMDJWEWMVw2VyS7XfjvToyisTKoD6QsWT2Of3uJg7XWcSZeDSqw";

const mockRp = {
  subject: CLIENT_ID,
  federation_entity: {},
  jwks: {
    keys: [
      {
        kid: "e46a4bf8-a84a-47d6-bf8e-ab0a40ff2d4b",
        kty: "RSA",
        n: "uagVklUdlqCXWbOQAwC3INPGx3sBarnVLhw2YOYaEpZMX_pPHqvDFP3qGe8_ao5WOKBA03q7xw5gTVaiKrUoJGuesyJRS6r6sV6UJ",
        e: "AQAB",
        alg: "RS256",
        use: "sig",
      },
    ],
  },
} as RelyingPartyConfig;

describe("verifyRequestObject", () => {
  it("should throw InvalidRequestObjectError when no public key was found in the EC", async () => {
    await expect(() =>
      verifyRequestObject(requestObjectJwt, {
        rpConf: {
          subject: CLIENT_ID,
          jwks: {
            keys: [{ kid: "no_key" }],
          },
        } as RelyingPartyConfig,
        clientId: CLIENT_ID,
      })
    ).rejects.toThrow(
      new InvalidRequestObjectError(
        "The public key for signature verification (e46a4bf8-a84a-47d6-bf8e-ab0a40ff2d4b) cannot be found in the Entity Configuration"
      )
    );
  });

  it("should throw InvalidRequestObjectError when the JWT signature is invalid", async () => {
    jest.spyOn(jwtModule, "verify").mockRejectedValue("Invalid signature");

    await expect(() =>
      verifyRequestObject(requestObjectJwt, {
        rpConf: mockRp,
        clientId: CLIENT_ID,
      })
    ).rejects.toThrow(
      new InvalidRequestObjectError(
        "The Request Object signature verification failed"
      )
    );
  });

  it("should throw InvalidRequestObjectError when the Request Object shape is invalid", async () => {
    jest.spyOn(jwtModule, "verify").mockResolvedValue(VERIFY_RESULT_MOCK);
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImU0NmE0YmY4LWE4NGEtNDdkNi1iZjhlLWFiMGE0MGZmMmQ0YiJ9.eyJjbGllbnRfaWQiOiJodHRwczovL3JlbHlpbmdfcGFydHkucnAiLCJpc3MiOiJodHRwczovL3JlbHlpbmdfcGFydHkucnAiLCJyZXNwb25zZV9tb2RlIjoiZGlyZWN0X3Bvc3Quand0Iiwic3RhdGUiOiJhYmMiLCJyZXNwb25zZV90eXBlIjoiaW52YWxpZF92cF90b2tlbiIsIm5vbmNlIjoiMTIzIiwicmVzcG9uc2VfdXJpIjoiaHR0cHM6Ly9yZWx5aW5nX3BhcnR5LnJwL3Jlc3BvbnNlX3VyaSIsImlhdCI6MTc0NTkyMzkyMywiZXhwIjoxNzY1OTMzOTIzLCJkY3FsX3F1ZXJ5Ijp7fX0.QH5KojcaROg8bPCcazbM-lrlcpRVe1CcuKFALYU2Hzk_Vdm-Jeue2XSQNnvZxwok-w8Ou5ihQ3bBkR7hziSN_P81jPJPyiXBMgPbAHWwECGEcyVrtxefT37-6JOFvhBVyyltWEEkhWn9xroYtu6ZjbfUvher-r9lsGtfGJXHNhDMxNuYRjT_Jg5c7JjCZCdNqAsZOVf8p98r6fPh0uQVIm6ay-F-Akp_dxmD33BcfMN_yB00w0aUB6VrrgRVlPhyvjxhdvyRfB__1hV1wGzrt0XTHtuCgqYzi7CoIdPk6PcRPtxV_SMYUX6swjNiIRY9_nD7c5AHKMz1QpTrZkHGog";
    await expect(() =>
      verifyRequestObject(jwt, {
        rpConf: mockRp,
        clientId: CLIENT_ID,
      })
    ).rejects.toThrow(
      new InvalidRequestObjectError(
        "The Request Object cannot be parsed successfully"
      )
    );
  });

  it("should throw InvalidRequestObjectError when the client ID does not match", async () => {
    jest.spyOn(jwtModule, "verify").mockResolvedValue(VERIFY_RESULT_MOCK);
    await expect(() =>
      verifyRequestObject(requestObjectJwt, {
        rpConf: mockRp,
        clientId: "wrong_client_id",
      })
    ).rejects.toThrow(
      new InvalidRequestObjectError(
        "Client ID does not match Request Object or Entity Configuration"
      )
    );
  });

  it("should throw InvalidRequestObjectError when the state does not match", async () => {
    jest.spyOn(jwtModule, "verify").mockResolvedValue(VERIFY_RESULT_MOCK);
    await expect(() =>
      verifyRequestObject(requestObjectJwt, {
        rpConf: mockRp,
        clientId: CLIENT_ID,
        state: "xyz",
      })
    ).rejects.toThrow(
      new InvalidRequestObjectError(
        "The provided state does not match the Request Object's"
      )
    );
  });

  it("should successfully verify the Request Object", async () => {
    jest.spyOn(jwtModule, "verify").mockResolvedValue(VERIFY_RESULT_MOCK);
    const expected: RequestObject = {
      client_id: CLIENT_ID,
      iss: CLIENT_ID,
      state: "abc",
      nonce: "123",
      response_uri: "https://relying_party.rp/response_uri",
      dcql_query: {},
      response_mode: "direct_post.jwt",
      response_type: "vp_token",
    };
    expect(
      await verifyRequestObject(requestObjectJwt, {
        rpConf: mockRp,
        state: "abc",
        clientId: CLIENT_ID,
      })
    ).toEqual({ requestObject: expected });
  });

  it("should throw if no Relying Party configuration is provided", async () => {
    await expect(() =>
      verifyRequestObject(requestObjectJwt, { clientId: CLIENT_ID })
    ).rejects.toThrow(IoWalletError);
  });
});
