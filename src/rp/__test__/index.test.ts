import { RelyingPartySolution } from "..";
import { AuthRequestDecodeError } from "../../utils/errors";

describe("decodeAuthRequestQR", () => {
  it("should return authentication request URL", async () => {
    const qrcode =
      "ZXVkaXc6Ly9hdXRob3JpemU/Y2xpZW50X2lkPWh0dHBzOi8vdmVyaWZpZXIuZXhhbXBsZS5vcmcmcmVxdWVzdF91cmk9aHR0cHM6Ly92ZXJpZmllci5leGFtcGxlLm9yZy9yZXF1ZXN0X3VyaQ==";
    const result = RelyingPartySolution.decodeAuthRequestQR(qrcode);
    expect(result.requestURI).toEqual(
      "https://verifier.example.org/request_uri"
    );
  });
  it("should throw exception with invalid QR", async () => {
    const qrcode = "aHR0cDovL2dvb2dsZS5pdA==";
    expect(() => RelyingPartySolution.decodeAuthRequestQR(qrcode)).toThrowError(
      AuthRequestDecodeError
    );
  });
});
