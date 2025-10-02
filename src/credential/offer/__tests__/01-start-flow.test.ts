import { startFlowFromQR } from "../01-start-flow";
import { InvalidQRCodeError } from "../errors";

describe("startFlowFromQR", () => {
  it("should successfully decode a QR code with a credential offer by reference", () => {
    expect(
      startFlowFromQR(
        "openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fserver%2Eexample%2Ecom%2Fcredential-offer%2FGkurKxf5T0Y-mnPFCHqWOMiZi4VS138cQO_V7PZHAdM"
      )
    ).toEqual({
      credential_offer_uri:
        "https://server.example.com/credential-offer/GkurKxf5T0Y-mnPFCHqWOMiZi4VS138cQO_V7PZHAdM",
    });
  });

  it("should successfully decode a QR code with a credential offer by value", () => {
    expect(
      startFlowFromQR(
        "openid-credential-offer://?credential_offer=%7B%22credential_issuer%22:%22https://credential-issuer.example.com%22,%22credential_configuration_ids%22:%5B%22org.iso.18013.5.1.mDL%22%5D,%22grants%22:%7B%22urn:ietf:params:oauth:grant-type:pre-authorized_code%22:%7B%22pre-authorized_code%22:%22oaKazRN8I0IbtZ0C7JuMn5%22,%22tx_code%22:%7B%22input_mode%22:%22text%22,%22description%22:%22Please%20enter%20the%20serial%20number%20of%20your%20physical%20drivers%20license%22%7D%7D%7D%7D"
      )
    ).toEqual({
      credential_offer: {
        credential_issuer: "https://credential-issuer.example.com",
        credential_configuration_ids: ["org.iso.18013.5.1.mDL"],
        grants: {
          "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
            "pre-authorized_code": "oaKazRN8I0IbtZ0C7JuMn5",
            tx_code: {
              input_mode: "text",
              description:
                "Please enter the serial number of your physical drivers license",
            },
          },
        },
      },
    });
  });

  it("should throw InvalidQRCodeError if not a valid credential offer deep link", () => {
    expect(() =>
      startFlowFromQR(
        "deeplink://?credential_offer_uri=https%3A%2F%2Fserver%2Eexample%2Ecom%2Fcredential-offer%2FGkurKxf5T0Y-mnPFCHqWOMiZi4VS138cQO_V7PZHAdM"
      )
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError if it does not contain the correct params", () => {
    expect(() =>
      startFlowFromQR("openid-credential-offer://?wrong_param=wrong_value")
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError if it does not contain a valid json", () => {
    expect(() =>
      startFlowFromQR("openid-credential-offer://?credential_offer=not_a_json")
    ).toThrow(InvalidQRCodeError);
  });

  it("should throw InvalidQRCodeError if credential offer contains an invalid json", () => {
    expect(() =>
      startFlowFromQR(
        "openid-credential-offer://?credential_offer=%7B%22credential_issuer%22:%22https://credential-issuer.example.com%22,%22credential_configuration_ids%22:%5B%22org.iso.18013.5.1.mDL%22%5D,%22grants%22:%7B%22urn:ietf:params:oauth:grant-type:pre-authorized_code%22:%7B%22,%22tx_code%22:%7B%22input_mode%22:%22text%22,%22description%22:%22Please%20enter%20the%20serial%20number%20of%20your%20physical%20drivers%20license%22%7D%7D%7D%7D"
      )
    ).toThrow(InvalidQRCodeError);
  });
});
