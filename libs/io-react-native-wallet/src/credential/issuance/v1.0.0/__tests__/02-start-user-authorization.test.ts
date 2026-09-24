import { generate } from "@pagopa/io-react-native-crypto";
import { decode } from "@pagopa/io-react-native-jwt";

import type { IssuerConfig } from "../../api";

import { startUserAuthorization } from "../02-start-user-authorization";
import { createCryptoContextFor } from "../../../../utils/crypto";

const mockIssuerConf = {
  credential_configurations_supported: {
    MDL: {},
    PersonIdentificationData: {},
    TS: {},
  },
  pushed_authorization_request_endpoint: "https://issuer.example/par",
  response_modes_supported: ["query", "form_post.jwt"],
} as unknown as IssuerConfig;

const createMockFetch = () =>
  jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue({
      expires_in: 1000000,
      request_uri: "https://issuer.example/123456",
    }),
    status: 201,
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
        appFetch: mockFetch,
        redirectUri: "https://redirect",
        walletInstanceAttestation: mockWia,
        wiaCryptoContext: ephemeralContext,
      },
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
        appFetch: mockFetch,
        redirectUri: "https://redirect",
        walletInstanceAttestation: mockWia,
        wiaCryptoContext: ephemeralContext,
      },
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
      "form_post.jwt",
    );
  });

  it("should throw when multiple credentials have incompatible response_mode", async () => {
    const ephemeralKeytag = `ephemeral-${Math.random()}`;
    await generate(ephemeralKeytag);
    const ephemeralContext = createCryptoContextFor(ephemeralKeytag);

    await expect(() =>
      startUserAuthorization(
        mockIssuerConf,
        ["PersonIdentificationData", "MDL"],
        { proofType: "none" },
        {
          appFetch: createMockFetch(),
          redirectUri: "https://redirect",
          walletInstanceAttestation: mockWia,
          wiaCryptoContext: ephemeralContext,
        },
      ),
    ).rejects.toThrow();
  });
});
