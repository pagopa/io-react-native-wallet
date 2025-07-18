import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
} from "../../../utils/errors";
import { verifyAndParseStatusAssertion } from "..";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { EvaluateIssuerTrust } from "../../issuance";
import type { Out } from "../../../utils/misc";

const mockPubKey = {
  kty: "EC",
  alg: "ES256",
  kid: "7ac639c7-dd8a-4c38-8c0c-495a3a66a080",
  crv: "P-256",
  x: "s7Zct9Ja-paKlJDumZ9iBwdlyRfDAJg-IshoSIrZvuY",
  y: "m38FnFXyd16mqUO6xpz0MrcDiedJFhtLJLENX59nEjI",
};

const cryptoContext: CryptoContext = {
  getPublicKey: async () => mockPubKey,
  getSignature: async () => "",
};

const mockIssuerConf = {
  openid_credential_issuer: {
    jwks: {
      keys: [mockPubKey],
    },
  },
} as unknown as Out<EvaluateIssuerTrust>["issuerConf"];

describe("verifyAndParseStatusAssertion", () => {
  it("parses a valid assertion for a valid credential", async () => {
    const result = await verifyAndParseStatusAssertion(
      mockIssuerConf,
      {
        statusAssertion:
          "eyJraWQiOiI3YWM2MzljNy1kZDhhLTRjMzgtOGMwYy00OTVhM2E2NmEwODAiLCJ0eXAiOiJzdGF0dXMtYXNzZXJ0aW9uK2p3dCIsImFsZyI6IkVTMjU2In0.eyJjcmVkZW50aWFsX3N0YXR1c190eXBlIjoiMHgwMCIsImNyZWRlbnRpYWxfaGFzaF9hbGciOiJzaGEtMjU2IiwiaXNzIjoiaHR0cHM6Ly9wcmUuZWFhLndhbGxldC5pcHpzLml0LzEtMCIsImNyZWRlbnRpYWxfaGFzaCI6ImM2YzZmZDhmNjhhZjE5NDBhYzVkYzVhNDljYzAxODg2ZjNmZWEwYzVhYzA3Njk4ZTY1ZGQ5N2IwODVhMmIyMWEiLCJjbmYiOnsiandrIjp7Imt0eSI6IkVDIiwiYWxnIjoiRVMyNTYiLCJraWQiOiI3YWM2MzljNy1kZDhhLTRjMzgtOGMwYy00OTVhM2E2NmEwODAiLCJjcnYiOiJQLTI1NiIsIngiOiJzN1pjdDlKYS1wYUtsSkR1bVo5aUJ3ZGx5UmZEQUpnLUlzaG9TSXJadnVZIiwieSI6Im0zOEZuRlh5ZDE2bXFVTzZ4cHowTXJjRGllZEpGaHRMSkxFTlg1OW5FakkifX0sImV4cCI6MTc1MjgzMjU1NywiaWF0IjoxNzUyNzQ2MTU3LCJqdGkiOiIxNDQ4NTZlOC04MTRhLTRmNjItYmI0NS0xOTZlMjU5ZmFlZTYifQ.9rtsrit-z4YRd3QijW6hKXYCc_YFNNnZPjGtWPzaLFurClQTrBxzABRgfXF9OJ62iDpy7CI5Fr0HlZtkbnT9iA",
      },
      { credentialCryptoContext: cryptoContext }
    );
    expect(result.parsedStatusAssertion.payload).toEqual(
      expect.objectContaining({
        credential_status_type: "0x00",
        credential_hash_alg: "sha-256",
        iss: "https://pre.eaa.wallet.ipzs.it/1-0",
        credential_hash:
          "c6c6fd8f68af1940ac5dc5a49cc01886f3fea0c5ac07698e65dd97b085a2b21a",
        cnf: { jwk: mockPubKey },
      })
    );
  });

  it("parses a valid assertion for an invalid credential", async () => {
    try {
      await verifyAndParseStatusAssertion(
        mockIssuerConf,
        {
          statusAssertion:
            "eyJraWQiOiI3YWM2MzljNy1kZDhhLTRjMzgtOGMwYy00OTVhM2E2NmEwODAiLCJ0eXAiOiJzdGF0dXMtYXNzZXJ0aW9uK2p3dCIsImFsZyI6IkVTMjU2In0.eyJjcmVkZW50aWFsX3N0YXR1c190eXBlIjoiMHgwMSIsImNyZWRlbnRpYWxfc3RhdHVzX2RldGFpbCI6eyJzdGF0ZSI6InJldm9rZWQiLCJkZXNjcmlwdGlvbiI6IkxvcmVtIGlwc3VtIn0sImNyZWRlbnRpYWxfaGFzaF9hbGciOiJzaGEtMjU2IiwiaXNzIjoiaHR0cHM6Ly9wcmUuZWFhLndhbGxldC5pcHpzLml0LzEtMCIsImNyZWRlbnRpYWxfaGFzaCI6ImM2YzZmZDhmNjhhZjE5NDBhYzVkYzVhNDljYzAxODg2ZjNmZWEwYzVhYzA3Njk4ZTY1ZGQ5N2IwODVhMmIyMWEiLCJjbmYiOnsiandrIjp7Imt0eSI6IkVDIiwiYWxnIjoiRVMyNTYiLCJraWQiOiI3YWM2MzljNy1kZDhhLTRjMzgtOGMwYy00OTVhM2E2NmEwODAiLCJjcnYiOiJQLTI1NiIsIngiOiJzN1pjdDlKYS1wYUtsSkR1bVo5aUJ3ZGx5UmZEQUpnLUlzaG9TSXJadnVZIiwieSI6Im0zOEZuRlh5ZDE2bXFVTzZ4cHowTXJjRGllZEpGaHRMSkxFTlg1OW5FakkifX0sImV4cCI6MTc1MjgzMjU1NywiaWF0IjoxNzUyNzQ2MTU3LCJqdGkiOiIxNDQ4NTZlOC04MTRhLTRmNjItYmI0NS0xOTZlMjU5ZmFlZTYifQ.-b9RC0Gd1gjmInwELJvLwgF3XMFzBrHV669x-oJQO9b1tH3PQN_U6LQ0TBnHlyN9n0MCGJY3n3Sj4vqBKMwL8A",
        },
        { credentialCryptoContext: cryptoContext }
      );
    } catch (err) {
      expect(err).toBeInstanceOf(IssuerResponseError);
      const error = err as IssuerResponseError;
      expect(error.code).toEqual(
        IssuerResponseErrorCodes.CredentialInvalidStatus
      );
      expect(error.reason).toEqual(
        expect.objectContaining({
          error: "revoked",
          error_description: "Lorem ipsum",
        })
      );
    }
  });

  it("parses an assertion with an error", async () => {
    try {
      await verifyAndParseStatusAssertion(
        mockIssuerConf,
        {
          statusAssertion:
            "eyJraWQiOiI3YWM2MzljNy1kZDhhLTRjMzgtOGMwYy00OTVhM2E2NmEwODAiLCJ0eXAiOiJzdGF0dXMtYXNzZXJ0aW9uLWVycm9yK2p3dCIsImFsZyI6IkVTMjU2In0.eyJjcmVkZW50aWFsX2hhc2hfYWxnIjoic2hhLTI1NiIsImVycm9yX2Rlc2NyaXB0aW9uIjoiQ3JlZGVudGlhbCBub3QgZm91bmQiLCJpc3MiOiJodHRwczovL3ByZS5lYWEud2FsbGV0LmlwenMuaXQvMS0wIiwiY3JlZGVudGlhbF9oYXNoIjoiYjdkY2RhMjc1YjJjNzE3ZGMwMWNiZmU4YmExNjM5MjIwMmJkZGJiOTUwODU2MjIwMzY0NDdhZDA3MzFiMDJmYyIsImV4cCI6MTc1MjgyNTg5OSwiZXJyb3IiOiJjcmVkZW50aWFsX25vdF9mb3VuZCIsImlhdCI6MTc1MjczOTQ5OX0.WanqL5c_JmikZtQugw2YbUaX45mA6NLRUm32Id2W4HBNGKR_Sbt6DbmE3tDijQGyQV_TnjZ1LmKRrxyC1LmYeQ",
        },
        { credentialCryptoContext: cryptoContext }
      );
    } catch (err) {
      expect(err).toBeInstanceOf(IssuerResponseError);
      const error = err as IssuerResponseError;
      expect(error.code).toEqual(
        IssuerResponseErrorCodes.StatusAttestationRequestFailed
      );
      expect(error.reason).toEqual(
        expect.objectContaining({
          error: "credential_not_found",
          error_description: "Credential not found",
        })
      );
    }
  });
});
