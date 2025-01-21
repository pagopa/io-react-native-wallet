// startFlow.test.ts
import { startFlowFromQR } from "../01-start-flow";
import { AuthRequestDecodeError } from "../errors";

describe("startFlowFromQR", () => {
  const validQRCode =
    "https://example.com/path?request_uri=https%3A%2F%2Frequest.uri&client_id=client123";
  const haipQRCode =
    "haip://?request_uri=https%3A%2F%2Frequest.uri&client_id=client123";

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

  it("should successfully decode a valid haip QR code", () => {
    const result = startFlowFromQR(haipQRCode);

    expect(result).toEqual({
      protocol: "https:",
      resource: "wallet.example",
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
