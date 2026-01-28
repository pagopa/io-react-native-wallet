import { generate } from "@pagopa/io-react-native-crypto";
import { createCryptoContextFor } from "../../../utils/crypto";
import type { Out } from "../../../utils/misc";
import type { EvaluateIssuerTrustApi } from "../api/01-evaluate-issuer-trust";
import { startUserAuthorization } from "..";
import { decode } from "@pagopa/io-react-native-jwt";

const mockIssuerConf = {
  oauth_authorization_server: {
    pushed_authorization_request_endpoint: "https://issuer.example/par",
    response_modes_supported: ["query", "form_post.jwt"],
  },
  openid_credential_issuer: {
    credential_configurations_supported: {
      PersonIdentificationData: {},
      MDL: {},
      TS: {},
    },
  },
} as unknown as Out<
  EvaluateIssuerTrustApi["evaluateIssuerTrust"]
>["issuerConf"];

const createMockFetch = () =>
  jest.fn().mockResolvedValue({
    status: 201,
    json: jest.fn().mockResolvedValue({
      request_uri: "https://issuer.example/123456",
      expires_in: 1000000,
    }),
  });

const mockWia =
  "eyJ0eXAiOiJvYXV0aC1jbGllbnQtYXR0ZXN0YXRpb24rand0IiwiYWxnIjoiRVMyNTYiLCJraWQiOiJjbkRpRW0zNldjdEVnSnBwNUJfazNtdzdkZ2hrNzlNc3FfbHdWT3V4aG5NIn0.eyJpc3MiOiJodHRwczovL2lvLWQtd2FsbGV0LWl0LmF6dXJld2Vic2l0ZXMubmV0Iiwic3ViIjoiNG9oUGdVWFFJQS1MdmxxNFh4ZkZkSTdWRzVkU20xWW83NHo0UWtZeU1DbyIsImFhbCI6Imh0dHBzOi8vaW8tZC13YWxsZXQtaXQuYXp1cmV3ZWJzaXRlcy5uZXQvTG9BL2Jhc2ljIiwiY25mIjp7Imp3ayI6eyJjcnYiOiJQLTI1NiIsImt0eSI6IkVDIiwieCI6InVDZ0tnRzk5MFg2QkxBTmM4dkpqV1hHcW9DZ3ltTi1JeUU4bkNwRHFibnciLCJ5IjoiVGVIdGNXX1l2aXNFaGxiemVJMGZVRXhXNjNUZlBWc3Q2Q2NmWHA0STdjSSIsImtpZCI6IjRvaFBnVVhRSUEtTHZscTRYeGZGZEk3Vkc1ZFNtMVlvNzR6NFFrWXlNQ28ifX0sIndhbGxldF9saW5rIjoiaHR0cHM6Ly93YWxsZXQuaW8ucGFnb3BhLml0Iiwid2FsbGV0X25hbWUiOiJJVCBXYWxsZXQiLCJpYXQiOjE3MTkzMDMzODEsImV4cCI6MTcxOTMwNjk4MX0.Ocrc7dRxbz6ZeWvvvTY_NOWIkrlHu6PQ0bkTNAtXisuxl8HaSfEpr21n39sA1IfpmbBgN782bIQ4NlNnRIhq-A";

const extractParPayloadFromMock = (mock: jest.Mock) => {
  const [, { body }] = mock.mock.lastCall;
  const parPayload = new URLSearchParams(body).get("request");
  if (!parPayload) return {};
  return decode(parPayload).payload;
};

describe("startUserAuthorization", () => {
  it("works with a single credential (PID)", async () => {
    const ephemeralKeytag = `ephemeral-${Math.random()}`;
    await generate(ephemeralKeytag);
    const ephemeralContext = createCryptoContextFor(ephemeralKeytag);

    const mockFetch = createMockFetch();

    const result = await startUserAuthorization(
      mockIssuerConf,
      ["PersonIdentificationData"],
      { proofType: "none" },
      {
        wiaCryptoContext: ephemeralContext,
        redirectUri: "https://redirect",
        walletInstanceAttestation: mockWia,
        appFetch: mockFetch,
      }
    );

    expect(result.issuerRequestUri).toEqual("https://issuer.example/123456");
    expect(result.credentialDefinition).toEqual([
      {
        credential_configuration_id: "PersonIdentificationData",
        type: "openid_credential",
      },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(extractParPayloadFromMock(mockFetch).response_mode).toEqual("query");
  });

  it("works with multiple credentials (MDL, TS)", async () => {
    const ephemeralKeytag = `ephemeral-${Math.random()}`;
    await generate(ephemeralKeytag);
    const ephemeralContext = createCryptoContextFor(ephemeralKeytag);

    const mockFetch = createMockFetch();

    const result = await startUserAuthorization(
      mockIssuerConf,
      ["TS", "MDL"],
      { proofType: "none" },
      {
        wiaCryptoContext: ephemeralContext,
        redirectUri: "https://redirect",
        walletInstanceAttestation: mockWia,
        appFetch: mockFetch,
      }
    );

    expect(result.issuerRequestUri).toEqual("https://issuer.example/123456");
    expect(result.credentialDefinition).toEqual([
      {
        credential_configuration_id: "TS",
        type: "openid_credential",
      },
      {
        credential_configuration_id: "MDL",
        type: "openid_credential",
      },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(extractParPayloadFromMock(mockFetch).response_mode).toEqual(
      "form_post.jwt"
    );
  });

  it.failing(
    "should throw when multiple credentials have incompatible response_mode",
    async () => {
      const ephemeralKeytag = `ephemeral-${Math.random()}`;
      await generate(ephemeralKeytag);
      const ephemeralContext = createCryptoContextFor(ephemeralKeytag);

      await startUserAuthorization(
        mockIssuerConf,
        ["PersonIdentificationData", "MDL"],
        { proofType: "none" },
        {
          wiaCryptoContext: ephemeralContext,
          redirectUri: "https://redirect",
          walletInstanceAttestation: mockWia,
          appFetch: createMockFetch(),
        }
      );
    }
  );
});
