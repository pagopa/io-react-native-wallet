import type { CredentialIssuerEntityConfiguration } from "src/trust/types";
import { obtainCredential } from "../06-obtain-credential";
import type { TokenResponse } from "../types";
import type { AuthorizationDetail } from "src/utils/par";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import process from "node:process";

type IssuerConf = CredentialIssuerEntityConfiguration["payload"]["metadata"];

describe("obtainCredential", () => {
  let mockFetch: jest.Mock;
  let mockGetPublicKey: jest.Mock;
  let mockGetSignature: jest.Mock;
  let mockContext: {
    credentialCryptoContext: CryptoContext;
    dPopCryptoContext: CryptoContext;
    appFetch: jest.Mock;
  };
  let mockCredentialDefinition: AuthorizationDetail;
  let mockIssuerConf: IssuerConf;
  let mockAccessToken: TokenResponse;
  const mockClientId = "client_id";

  const mockFetchResolvedValue: Record<string, Record<string, any>> = {
    "https://issuer.example.com/nonce": {
      c_nonce: "123456",
    },
    "https://issuer.example.com/credential": {
      credentials: [{ credential: "mock_credential" }],
    },
  };

  beforeEach(() => {
    process.env.TOKEN_TYPE = "DPoP";
    process.env.ACCESS_TOKEN = "mock_access_token";
    mockFetch = jest.fn().mockImplementation(async (url: string) => ({
      status: 200,
      json: jest.fn().mockResolvedValue(mockFetchResolvedValue[url]),
    }));
    global.fetch = mockFetch;

    mockGetPublicKey = jest.fn().mockResolvedValue({
      kty: "RSA",
      n: "mockModulus",
      e: "AQAB",
      alg: "RS256",
    });

    mockGetSignature = jest.fn().mockResolvedValue("mockSignature");

    const createCryptoContext = () => ({
      getPublicKey: mockGetPublicKey,
      getSignature: mockGetSignature,
    });

    mockContext = {
      credentialCryptoContext: createCryptoContext(),
      dPopCryptoContext: createCryptoContext(),
      appFetch: mockFetch,
    };

    mockCredentialDefinition = {
      credential_configuration_id: "mock_credential_configuration_id",
      type: "openid_credential",
    };

    mockIssuerConf = {
      openid_credential_issuer: {
        credential_endpoint: "https://issuer.example.com/credential",
        nonce_endpoint: "https://issuer.example.com/nonce",
        credential_configurations_supported: {
          mock_credential_configuration_id: {
            format: "dc+sd-jwt",
          },
        },
      },
      oauth_authorization_server: {
        issuer: "https://issuer.example.com",
      },
    } as unknown as IssuerConf;

    mockAccessToken = {
      access_token: process.env.ACCESS_TOKEN,
      token_type: process.env.TOKEN_TYPE,
      expires_in: 3600,
      authorization_details: [
        {
          credential_configuration_id: "mock_credential_configuration_id",
          type: "openid_credential",
          credential_identifiers: ["credential_1"],
        },
      ],
    };
  });

  it("should not include operationType in the header when it is not provided", async () => {
    await obtainCredential(
      mockIssuerConf,
      mockAccessToken,
      mockClientId,
      mockCredentialDefinition,
      mockContext
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "https://issuer.example.com/credential",
      expect.objectContaining({
        method: "POST",
        headers: expect.not.objectContaining({
          operationType: expect.any(String),
        }),
      })
    );
  });

  it("should include operationType in the header when it is provided", async () => {
    await obtainCredential(
      mockIssuerConf,
      mockAccessToken,
      mockClientId,
      mockCredentialDefinition,
      mockContext,
      "reissuing"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "https://issuer.example.com/credential",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          operationType: "reissuing",
        }),
      })
    );
  });
});
