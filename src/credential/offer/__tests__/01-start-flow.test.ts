import { startFlowFromQR } from "../01-start-flow";
import { InvalidQRCodeError } from "../errors";

describe("startFlowFromQR", () => {
  it("should handle only valid schemes", () => {
    const encodedUri = encodeURIComponent("https://www.pagopa.gov.it/");

    expect(
      startFlowFromQR(
        "openid-credential-offer://?credential_offer_uri=" + encodedUri
      )
    ).toBeTruthy();

    expect(
      startFlowFromQR("haip://?credential_offer_uri=" + encodedUri)
    ).toBeTruthy();

    expect(() =>
      startFlowFromQR("http://?credential_offer_uri=" + encodedUri)
    ).toThrow(InvalidQRCodeError);
  });

  it("should successfully decode a QR code with a credential offer by reference", () => {
    expect(
      startFlowFromQR(
        "openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fserver%2Eexample%2Ecom%2Fcredential-offer%2FGkurKxf5T0Y-mnPFCHqWOMiZi4VS138cQO_V7PZHAdM"
      )
    ).toEqual({
      credential_offer_uri:
        "https://server.example.com/credential-offer/GkurKxf5T0Y-mnPFCHqWOMiZi4VS138cQO_V7PZHAdM",
    });

    expect(
      startFlowFromQR(
        "haip://?credential_offer_uri=https%3A%2F%2Fserver%2Eexample%2Ecom%2Fcredential-offer%2FGkurKxf5T0Y-mnPFCHqWOMiZi4VS138cQO_V7PZHAdM"
      )
    ).toEqual({
      credential_offer_uri:
        "https://server.example.com/credential-offer/GkurKxf5T0Y-mnPFCHqWOMiZi4VS138cQO_V7PZHAdM",
    });
  });

  it("should successfully decode a QR code with a credential offer by value", () => {
    const payload = {
      credential_issuer: "https://credential-issuer.example.com",
      credential_configuration_ids: ["org.iso.18013.5.1.mDL"],
      grants: {
        authorization_code: {
          authorization_server: "https://auth.example.com",
          issuer_state: "some-issuer-state",
        },
      },
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));

    expect(
      startFlowFromQR("openid-credential-offer://?credential_offer=" + encoded)
    ).toEqual({
      credential_offer: payload,
    });
  });

  it("should throw InvalidQRCodeError if not a valid credential offer deep link", () => {
    const payload = {
      credential_issuer: "not-a-valid-url", // Invalid URL
      credential_configuration_ids: ["org.iso.18013.5.1.mDL"],
      grants: {
        authorization_code: {
          authorization_server: "https://auth.example.com",
        },
      },
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));

    expect(() =>
      startFlowFromQR("openid-credential-offer://?credential_offer=" + encoded)
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError if it does not contain the correct params", () => {
    expect(() =>
      startFlowFromQR("openid-credential-offer://?wrong_param=wrong_value")
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError if it does not contain json value", () => {
    expect(() =>
      startFlowFromQR("openid-credential-offer://?credential_offer=not_a_json")
    ).toThrow(InvalidQRCodeError);
  });
});
