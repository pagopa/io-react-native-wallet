// startFlow.test.ts
import { startFlowFromQR } from "../01-start-flow";
import { InvalidQRCodeError } from "../errors";

describe("startFlowFromQR", () => {
  const request_uri = "https://request.uri";
  const client_id = "client123";
  const request_uri_method = "get";
  const state = "state123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully decode a valid QR code", () => {
    const result = startFlowFromQR({
      request_uri,
      client_id,
      request_uri_method,
      state,
    });

    expect(result).toEqual({
      request_uri,
      client_id,
      request_uri_method,
      state,
    });
  });

  it("should throw InvalidQRCodeError for invalid request_uri ", () => {
    expect(() =>
      startFlowFromQR({ request_uri_method, client_id, request_uri: "test" })
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError for invalid client_id", () => {
    expect(() =>
      startFlowFromQR({ request_uri, request_uri_method, client_id: "" })
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError for nullable parameters ", () => {
    expect(() =>
      startFlowFromQR({
        request_uri: null,
        request_uri_method: null,
        client_id: null,
      })
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError for missing parameters ", () => {
    expect(() => startFlowFromQR({ request_uri })).toThrow(InvalidQRCodeError);
  });
});
