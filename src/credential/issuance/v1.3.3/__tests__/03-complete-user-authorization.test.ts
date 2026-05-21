import {
  createAuthorizationResponse,
  fetchAuthorizationResponse,
} from "@pagopa/io-wallet-oid4vp";
import { RemotePresentation } from "../../../presentation/v1.3.3";
import { completeEaaUserAuthorizationWithQueryMode } from "../03-complete-user-authorization";
import { AuthorizationError } from "../../common/errors";
import type { IssuerConfig } from "../../api";
import type { RequestObject } from "../../../presentation";

jest.mock("@pagopa/io-wallet-oid4vp", () => ({
  ...jest.requireActual("@pagopa/io-wallet-oid4vp"),
  createAuthorizationResponse: jest.fn(),
  fetchAuthorizationResponse: jest.fn(),
  parseAuthorizeRequest: jest.fn(),
}));

jest.mock("../../../presentation/v1.3.3", () => ({
  RemotePresentation: {
    evaluateDcqlQuery: jest.fn(),
    prepareRemotePresentations: jest.fn(),
  },
}));

const CLIENT_REDIRECT_URI = "https://wallet.example.com/callback";
const mockPid: [string, string] = ["pid-key-tag", "mock-pid-credential"];
const finalRedirectUri = `${CLIENT_REDIRECT_URI}?code=auth-code-123&state=mock-state&iss=https%3A%2F%2Fissuer.example.com`;

jest.mocked(createAuthorizationResponse).mockResolvedValue({
  jarm: { responseJwe: "mock-jwe", encryptionJwk: { kty: "" } },
  authorizationResponsePayload: { vp_token: {} },
});
jest.mocked(RemotePresentation.evaluateDcqlQuery).mockResolvedValue([
  {
    id: "pid",
    format: "dc+sd-jwt",
    keyTag: mockPid[0],
    credential: mockPid[1],
    requiredDisclosures: [],
    presentationFrame: {},
    purposes: [],
    vct: "",
  },
]);
jest.mocked(RemotePresentation.prepareRemotePresentations).mockResolvedValue({
  presentations: [
    {
      credentialId: "pid",
      format: "dc+sd-jwt",
      vpToken: "mock-vp-token",
      requestedClaims: [],
    },
  ],
});
const mockFetchAuthorizationResponse = jest.mocked(fetchAuthorizationResponse);

const mockRequestObject = {
  client_id: "https://issuer.example.com",
  nonce: "mock-nonce",
  response_uri: "https://issuer.example.com/response",
  state: "mock-state",
  dcql_query: {},
  iss: "https://issuer.example.com",
  response_type: "vp_token",
} as unknown as RequestObject;

const mockIssuerConfig = {
  keys: [{ use: "sig", kty: "EC", crv: "P-256", x: "x", y: "y" }],
  encrypted_response_enc_values_supported: ["A128GCM"],
} as IssuerConfig;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("completeEaaUserAuthorizationWithQueryMode", () => {
  it("should return the authorization result when all steps succeed", async () => {
    mockFetchAuthorizationResponse.mockResolvedValue({
      redirect_uri: "https://issuer.example.com/auth/redirect",
    });

    const appFetch = jest.fn().mockResolvedValue({
      headers: { get: () => finalRedirectUri },
    });

    const result = await completeEaaUserAuthorizationWithQueryMode(
      mockRequestObject,
      mockIssuerConfig,
      mockPid,
      CLIENT_REDIRECT_URI,
      { appFetch }
    );

    expect(result).toMatchObject({
      code: "auth-code-123",
      state: "mock-state",
      iss: "https://issuer.example.com",
    });
  });

  it("should throw AuthorizationError when fetchAuthorizationResponse returns no redirect_uri", async () => {
    mockFetchAuthorizationResponse.mockResolvedValue({
      redirect_uri: undefined,
    });

    const appFetch = jest.fn();

    await expect(
      completeEaaUserAuthorizationWithQueryMode(
        mockRequestObject,
        mockIssuerConfig,
        mockPid,
        CLIENT_REDIRECT_URI,
        { appFetch }
      )
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("should throw AuthorizationError when the final response has no Location header", async () => {
    mockFetchAuthorizationResponse.mockResolvedValue({
      redirect_uri: "https://issuer.example.com/auth/redirect",
    });

    const appFetch = jest.fn().mockResolvedValue({
      headers: { get: () => null },
    });

    await expect(
      completeEaaUserAuthorizationWithQueryMode(
        mockRequestObject,
        mockIssuerConfig,
        mockPid,
        CLIENT_REDIRECT_URI,
        { appFetch }
      )
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("should throw AuthorizationError when the Location header does not start with clientRedirectUri", async () => {
    mockFetchAuthorizationResponse.mockResolvedValue({
      redirect_uri: "https://issuer.example.com/auth/redirect",
    });

    const appFetch = jest.fn().mockResolvedValue({
      headers: {
        get: () =>
          "https://unexpected.example.com/callback?code=abc&state=123&iss=iss",
      },
    });

    await expect(
      completeEaaUserAuthorizationWithQueryMode(
        mockRequestObject,
        mockIssuerConfig,
        mockPid,
        CLIENT_REDIRECT_URI,
        { appFetch }
      )
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("should call appFetch with the redirect_uri returned by fetchAuthorizationResponse", async () => {
    const intermediateRedirectUri = "https://issuer.example.com/auth/redirect";

    mockFetchAuthorizationResponse.mockResolvedValue({
      redirect_uri: intermediateRedirectUri,
    });

    const appFetch = jest.fn().mockResolvedValue({
      headers: { get: () => finalRedirectUri },
    });

    await completeEaaUserAuthorizationWithQueryMode(
      mockRequestObject,
      mockIssuerConfig,
      mockPid,
      CLIENT_REDIRECT_URI,
      { appFetch }
    );

    expect(appFetch).toHaveBeenCalledWith(intermediateRedirectUri);
  });
});
