import type { CredentialIssuerEntityConfiguration } from "src/trust/types";
import { obtainCredential } from "../06-obtain-credential";
import type { TokenResponse } from "../types";
import type { AuthorizationDetail } from "src/utils/par";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";

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
      format: "vc+sd-jwt",
      type: "openid_credential",
    };

    mockIssuerConf = {
      openid_credential_issuer: {
        credential_endpoint: "https://issuer.example.com/credential",
      },
    } as CredentialIssuerEntityConfiguration["payload"]["metadata"];

    mockAccessToken = {
      access_token: "mock_access_token",
      token_type: "DPoP",
      c_nonce: "mock_nonce",
      c_nonce_expires_in: 3600,
      expires_in: 3600,
      authorization_details: [
        {
          credential_configuration_id: "mock_credential_configuration_id",
          format: "vc+sd-jwt",
          type: "openid_credential",
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
