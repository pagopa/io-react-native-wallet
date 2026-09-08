import { startFlowFromQR } from "../01-start-flow";
// startFlow.test.ts
import { InvalidQRCodeError } from "../../common/errors";

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
      client_id,
      request_uri,
      request_uri_method,
      state,
    });

    expect(result).toEqual({
      client_id,
      request_uri,
      request_uri_method,
      state,
    });
  });

  it("should throw InvalidQRCodeError for invalid request_uri", () => {
    expect(() =>
      startFlowFromQR({ client_id, request_uri: "test", request_uri_method }),
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError for invalid client_id", () => {
    expect(() =>
      startFlowFromQR({ client_id: "", request_uri, request_uri_method }),
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError for nullable parameters", () => {
    expect(() =>
      startFlowFromQR({
        client_id: null,
        request_uri: null,
        request_uri_method: null,
      }),
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError for missing parameters", () => {
    expect(() => startFlowFromQR({ request_uri })).toThrow(InvalidQRCodeError);
  });
});
