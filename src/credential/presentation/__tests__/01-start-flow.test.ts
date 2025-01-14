// startFlow.test.ts
import { startFlowFromQR } from "../01-start-flow";
import { AuthRequestDecodeError } from "../errors";

describe("startFlowFromQR", () => {
  const validQRCode =
    "aHR0cHM6Ly9leGFtcGxlLmNvbS9wYXRoP3JlcXVlc3RfdXJpPWh0dHBzJTNBJTJGJTJGcmVxdWVzdC51cmkmY2xpZW50X2lkPWNsaWVudDEyMw==";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully decode a valid QR code", () => {
    const result = startFlowFromQR(validQRCode);

    expect(result).toEqual({
      protocol: "https:",
      resource: "example.com",
      requestURI: "https://request.uri",
      clientId: "client123",
    });
  });

  it("should throw AuthRequestDecodeError for invalid Base64", () => {
    expect(() => startFlowFromQR("invalidBase64")).toThrow(
      AuthRequestDecodeError
    );
  });

  it("should throw AuthRequestDecodeError when required query parameters are missing", () => {
    const incompleteURL =
      "aHR0cHM6Ly9leGFtcGxlLmNvbS9wYXRoP2NsaWVudF9pZD1jbGllbnQxMjM="; // Missing request_uri

    expect(() => startFlowFromQR(incompleteURL)).toThrow(
      AuthRequestDecodeError
    );
  });
});
