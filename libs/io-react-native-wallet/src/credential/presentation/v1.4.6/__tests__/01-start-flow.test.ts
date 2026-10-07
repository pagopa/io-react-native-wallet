import { startFlowFromQR } from "../01-start-flow";
import { InvalidQRCodeError } from "../../common/errors";

describe("startFlowFromQR", () => {
  const client_id = "client123";
  const request_uri = "https://rp.example.com/request";

  it("validates a request URI QR code and defaults its method to get", () => {
    expect(
      startFlowFromQR({ client_id, request_uri, state: "state123" }),
    ).toEqual({
      client_id,
      request_uri,
      request_uri_method: "get",
      state: "state123",
    });
  });

  it("preserves an explicit request URI method", () => {
    expect(
      startFlowFromQR({ client_id, request_uri, request_uri_method: "post" }),
    ).toEqual({ client_id, request_uri, request_uri_method: "post" });
  });

  it.each([
    ["a missing client ID", { request_uri }],
    ["an invalid request URI", { client_id, request_uri: "not-a-url" }],
    [
      "null request parameters",
      { client_id, request: null, request_uri: null },
    ],
    [
      "both a request and request URI",
      { client_id, request: "request", request_uri },
    ],
  ])("throws InvalidQRCodeError for %s", (_, params) => {
    expect(() => startFlowFromQR(params)).toThrow(InvalidQRCodeError);
  });

  it.each([null, undefined])("handles optional (%s) values", (value) => {
    expect(
      startFlowFromQR({
        client_id,
        request: value,
        request_uri,
        request_uri_method: value,
        state: value,
      }),
    ).toEqual({ client_id, request_uri, request_uri_method: "get" });
  });
});
