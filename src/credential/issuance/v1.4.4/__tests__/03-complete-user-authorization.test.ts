import {
  createAuthorizationResponse,
  fetchAuthorizationResponse,
} from "@pagopa/io-wallet-oid4vp";
import type { RequestObject } from "../../../presentation";
import type { EvaluatedDcqlQuery, IssuerConfig } from "../../api";

import { completeEaaUserAuthorizationWithQueryMode } from "../03-complete-user-authorization";
import { RemotePresentation } from "../../../presentation/v1.4.4";
import { AuthorizationError } from "../../common/errors";

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
const mockEvaluatedDcqlQuery = [
  {
    credential: mockPid[1],
    format: "dc+sd-jwt",
    id: "pid",
    keyTag: mockPid[0],
    presentationFrame: {},
    purposes: [],
    requiredDisclosures: [],
    vct: "",
  },
] satisfies EvaluatedDcqlQuery;

jest.mocked(createAuthorizationResponse).mockResolvedValue({
  authorizationResponsePayload: { vp_token: {} },
  jarm: { encryptionJwk: { kty: "" }, responseJwe: "mock-jwe" },
});
jest.mocked(RemotePresentation.prepareRemotePresentations).mockResolvedValue({
  presentations: [
    {
      credentialId: "pid",
      format: "dc+sd-jwt",
      requestedClaims: [],
      vpToken: "mock-vp-token",
    },
  ],
});
const mockFetchAuthorizationResponse = jest.mocked(fetchAuthorizationResponse);

const mockRequestObject = {
  client_id: "https://issuer.example.com",
  dcql_query: {},
  iss: "https://issuer.example.com",
  nonce: "mock-nonce",
  response_type: "vp_token",
  response_uri: "https://issuer.example.com/response",
  state: "mock-state",
} as unknown as RequestObject;

const mockIssuerConfig = {
  encrypted_response_enc_values_supported: ["A128GCM"],
  keys: [{ crv: "P-256", kty: "EC", use: "sig", x: "x", y: "y" }],
} as IssuerConfig;

function mockFetchWithResponseUrl(url: string) {
  return jest.fn(async () => {
    const res = new Response(null, { status: 200 });
    Object.defineProperty(res, "url", { value: url });
    return res;
  });
}

describe("completeEaaUserAuthorizationWithQueryMode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the authorization result when all steps succeed", async () => {
    mockFetchAuthorizationResponse.mockResolvedValue({
      redirect_uri: "https://issuer.example.com/auth/redirect",
    });

    const appFetch = mockFetchWithResponseUrl(finalRedirectUri);

    const result = await completeEaaUserAuthorizationWithQueryMode(
      mockRequestObject,
      mockIssuerConfig,
      mockEvaluatedDcqlQuery,
      CLIENT_REDIRECT_URI,
      { appFetch },
    );

    expect(result).toMatchObject({
      code: "auth-code-123",
      iss: "https://issuer.example.com",
      state: "mock-state",
    });
    expect(RemotePresentation.evaluateDcqlQuery).not.toHaveBeenCalled();
    expect(RemotePresentation.prepareRemotePresentations).toHaveBeenCalledWith(
      mockEvaluatedDcqlQuery,
      {
        clientId: mockRequestObject.client_id,
        nonce: mockRequestObject.nonce,
        responseUri: mockRequestObject.response_uri,
      },
    );
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
        mockEvaluatedDcqlQuery,
        CLIENT_REDIRECT_URI,
        { appFetch },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("should throw AuthorizationError when the redirect_uri cannot be fetched successfully", async () => {
    mockFetchAuthorizationResponse.mockResolvedValue({
      redirect_uri: "https://issuer.example.com/auth/redirect",
    });

    const appFetch = jest.fn(async () => new Response(null, { status: 404 }));

    await expect(
      completeEaaUserAuthorizationWithQueryMode(
        mockRequestObject,
        mockIssuerConfig,
        mockEvaluatedDcqlQuery,
        CLIENT_REDIRECT_URI,
        { appFetch },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("should throw AuthorizationError when the final redirect url does not start with clientRedirectUri", async () => {
    mockFetchAuthorizationResponse.mockResolvedValue({
      redirect_uri: "https://issuer.example.com/auth/redirect",
    });

    const appFetch = mockFetchWithResponseUrl(
      "https://unexpected.example.com/callback?code=abc&state=123&iss=iss",
    );

    await expect(
      completeEaaUserAuthorizationWithQueryMode(
        mockRequestObject,
        mockIssuerConfig,
        mockEvaluatedDcqlQuery,
        CLIENT_REDIRECT_URI,
        { appFetch },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("should call appFetch with the redirect_uri returned by fetchAuthorizationResponse", async () => {
    const intermediateRedirectUri = "https://issuer.example.com/auth/redirect";

    mockFetchAuthorizationResponse.mockResolvedValue({
      redirect_uri: intermediateRedirectUri,
    });

    const appFetch = mockFetchWithResponseUrl(finalRedirectUri);

    await completeEaaUserAuthorizationWithQueryMode(
      mockRequestObject,
      mockIssuerConfig,
      mockEvaluatedDcqlQuery,
      CLIENT_REDIRECT_URI,
      { appFetch },
    );

    expect(appFetch).toHaveBeenCalledWith(intermediateRedirectUri);
  });
});
