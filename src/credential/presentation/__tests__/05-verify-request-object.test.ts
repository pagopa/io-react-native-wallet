import * as jwtModule from "@pagopa/io-react-native-jwt";
import { InvalidRequestObjectError } from "../errors";
import type { RequestObject } from "../types";
import { verifyRequestObject } from "..";
import type { RelyingPartyEntityConfiguration } from "../../../trust/types";

const CLIENT_ID = "https://relying_party.rp";
const VERIFY_RESULT_MOCK = { payload: {}, protectedHeader: {} };

const requestObjectJwt =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImU0NmE0YmY4LWE4NGEtNDdkNi1iZjhlLWFiMGE0MGZmMmQ0YiJ9.eyJjbGllbnRfaWQiOiJodHRwczovL3JlbHlpbmdfcGFydHkucnAiLCJpc3MiOiJodHRwczovL3JlbHlpbmdfcGFydHkucnAiLCJyZXNwb25zZV9tb2RlIjoiZGlyZWN0X3Bvc3Quand0Iiwic3RhdGUiOiJhYmMiLCJyZXNwb25zZV90eXBlIjoidnBfdG9rZW4iLCJub25jZSI6IjEyMyIsInJlc3BvbnNlX3VyaSI6Imh0dHBzOi8vcmVseWluZ19wYXJ0eS5ycC9yZXNwb25zZV91cmkiLCJpYXQiOjE3NDU5MjM5MjMsImV4cCI6MTc2NTkzMzkyMywiZGNxbF9xdWVyeSI6e319.N7A1y1Xzdfu4OYUuCLjiasdKoKlzU3gKcG2uHYUoPFVD1VYZU2YxUKLDdllqTrCpK4z_uCT7g8foO6ra1YdBlmr89Vf50qXMBe9Db7H31SE3n90nGFNxxjXNtTJrb20k4HQ5w9ATn9_-rkdVpDPjsdIj8ao3HQ_MYsTU-z03b9rgeesodcDJfuIsBtvUTpHG0voWQC65ZK2HOIVt6NNLVgxKZyB6VJHFbC_0_5-uzOGtYsyQSva_Wj9LHiMiqLUrqJCE8FToUAEhZ2QK9npxiPsUQH0gE24rowUO156ezJD-jnxZrU2atvMaNtgJgLik4z9WlgaUugnjvdFMDOM2sw";

const mockRp = {
  openid_credential_verifier: {
    jwks: {
      keys: [
        {
          kid: "e46a4bf8-a84a-47d6-bf8e-ab0a40ff2d4b",
          kty: "RSA",
          n: "ngbUsmZnMmNw-A1YzhiHOTJiFijHvH38xUamRrcbYKk3TCepRE1JL3cXNoLOBvxGy5pPLT6qo8n_Rw3TmcTaxxXsW1GSmCf90P_pj36kyOffILFNG8bqYt6LO2O74RAJIKy7szDrLZGg5iRjKlKwDjmzn3CfBM4pbam_Gzlj3YZ42DoKHZqRROe7kUVlPU0ro8rtLnBhp8Qotd8CbtVn4tRtfIR4FJBgz_isAhVvJ9rL-2dEQmqiOd-Wk2kpY_3BJd3LVqIi8BTx6EysgZoba1DyWpCDg_0UFjaqh8iWayB0IJQbtIv2mX5Pa0bLjWjW2wuDlqkh4xp1_4fyn1wt7w",
          e: "AQAB",
          alg: "RS256",
          use: "sig",
        },
      ],
    },
  },
} as RelyingPartyEntityConfiguration["payload"]["metadata"];

describe("verifyRequestObject", () => {
  it("should throw InvalidRequestObjectError when no public key was found in the EC", async () => {
    await expect(() =>
      verifyRequestObject(requestObjectJwt, [], {
        rpSubject: CLIENT_ID,
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
      verifyRequestObject(
        requestObjectJwt,
        mockRp.openid_credential_verifier.jwks.keys,
        { rpSubject: CLIENT_ID }
      )
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
      verifyRequestObject(jwt, mockRp.openid_credential_verifier.jwks.keys, {
        rpSubject: CLIENT_ID,
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
      verifyRequestObject(
        requestObjectJwt,
        mockRp.openid_credential_verifier.jwks.keys,
        { rpSubject: "wrong_client_id" }
      )
    ).rejects.toThrow(
      new InvalidRequestObjectError(
        "Client ID does not match Request Object or Entity Configuration"
      )
    );
  });

  it("should throw InvalidRequestObjectError when the state does not match", async () => {
    jest.spyOn(jwtModule, "verify").mockResolvedValue(VERIFY_RESULT_MOCK);
    await expect(() =>
      verifyRequestObject(
        requestObjectJwt,
        mockRp.openid_credential_verifier.jwks.keys,
        {
          rpSubject: CLIENT_ID,
          state: "xyz",
        }
      )
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
      response_mode: "direct_post.jwt",
      state: "abc",
      response_type: "vp_token",
      nonce: "123",
      response_uri: "https://relying_party.rp/response_uri",
      iat: 1745923923,
      exp: 1765933923,
      dcql_query: {},
    };
    expect(
      await verifyRequestObject(
        requestObjectJwt,
        mockRp.openid_credential_verifier.jwks.keys
      )
    ).toEqual({ requestObject: expected });
  });
});
