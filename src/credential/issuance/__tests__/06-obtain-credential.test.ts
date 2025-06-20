import type { CredentialIssuerEntityConfiguration } from "src/trust/types";
import { obtainCredential } from "../06-obtain-credential";
import type { TokenResponse } from "../types";
import type { AuthorizationDetail } from "src/utils/par";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import process from "node:process";

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
  let mockIssuerConf: CredentialIssuerEntityConfiguration["payload"]["metadata"];
  let mockAccessToken: TokenResponse;
  const mockClientId = "client_id";

  beforeEach(() => {
    process.env.TOKEN_TYPE = "DPoP";
    process.env.ACCESS_TOKEN = "mock_access_token";
    mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({
        c_nonce: "mock_nonce",
        c_nonce_expires_in: 3600,
        credential: "mock_credential",
        format: "vc+sd-jwt",
      }),
    });
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
      },
    } as CredentialIssuerEntityConfiguration["payload"]["metadata"];

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
