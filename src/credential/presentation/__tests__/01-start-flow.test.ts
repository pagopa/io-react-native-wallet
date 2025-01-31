// startFlow.test.ts
import { ValidationFailed } from "../../../utils/errors";
import { startFlowFromQR } from "../01-start-flow";

describe("startFlowFromQR", () => {
  const request_uri = "https://request.uri";
  const client_id = "client123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully decode a valid QR code", () => {
    const result = startFlowFromQR(request_uri, client_id);

    expect(result).toEqual({
      requestUri: request_uri,
      clientId: client_id,
    });
  });

  it("should throw InvalidQRCodeError for invalid request_uri ", () => {
    expect(() => startFlowFromQR("test", client_id)).toThrow(ValidationFailed);
  });

  it("should throw InvalidQRCodeError for invalid client_id", () => {
    expect(() => startFlowFromQR(request_uri, "")).toThrow(ValidationFailed);
  });
});
