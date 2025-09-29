// startFlow.test.ts
import { ValidationFailed } from "../../../utils/errors";
import { startFlowFromQR } from "../01-start-flow";

describe("startFlowFromQR", () => {
  const QR_URL =
    "av://?response_type=vp_token&response_mode=direct_post&client_id=test&response_uri=https%3A%2F%2Fverifier.av.org&dcql_query=%7B%22credentials%22%3A%5B%7B%22id%22%3A%22proof_of_age%22%2C%22format%22%3A%22mso_mdoc%22%2C%22meta%22%3A%7B%22doctype_value%22%3A%22eu.europa.ec.av.1%22%7D%2C%22claims%22%3A%5B%7B%22path%22%3A%5B%22eu.europa.ec.av.1%22%2C%22age_over_18%22%5D%7D%5D%7D%5D%7D&nonce=test-nonce&state=test-state";
  const QR_URL_UNSUPPORTED_RESPONSE_TYPE =
    "av://?response_type=unsupported&response_mode=direct_post&client_id=test&response_uri=https%3A%2F%2Fverifier.av.org&dcql_query=%7B%22credentials%22%3A%5B%7B%22id%22%3A%22proof_of_age%22%2C%22format%22%3A%22mso_mdoc%22%2C%22meta%22%3A%7B%22doctype_value%22%3A%22eu.europa.ec.av.1%22%7D%2C%22claims%22%3A%5B%7B%22path%22%3A%5B%22eu.europa.ec.av.1%22%2C%22age_over_18%22%5D%7D%5D%7D%5D%7D&nonce=test-nonce&state=test-state";
  const QR_URL_UNSUPPORTED_RESPONSE_MODE =
    "av://?response_type=unsupported&response_mode=direct_post.jwt&client_id=test&response_uri=https%3A%2F%2Fverifier.av.org&dcql_query=%7B%22credentials%22%3A%5B%7B%22id%22%3A%22proof_of_age%22%2C%22format%22%3A%22mso_mdoc%22%2C%22meta%22%3A%7B%22doctype_value%22%3A%22eu.europa.ec.av.1%22%7D%2C%22claims%22%3A%5B%7B%22path%22%3A%5B%22eu.europa.ec.av.1%22%2C%22age_over_18%22%5D%7D%5D%7D%5D%7D&nonce=test-nonce&state=test-state";
  const QR_URL_MISSING_MANDATORY_FIELD =
    "av://?response_type=unsupported&response_mode=direct_post.jwt&client_id=test&response_uri=https%3A%2F%2Fverifier.av.org&dcql_query=%7B%22credentials%22%3A%5B%7B%22id%22%3A%22proof_of_age%22%2C%22format%22%3A%22mso_mdoc%22%2C%22meta%22%3A%7B%22doctype_value%22%3A%22eu.europa.ec.av.1%22%7D%2C%22claims%22%3A%5B%7B%22path%22%3A%5B%22eu.europa.ec.av.1%22%2C%22age_over_18%22%5D%7D%5D%7D%5D%7D&state=test-state";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully decode a valid QR code", () => {
    const result = startFlowFromQR(new URL(QR_URL));

    expect(result).toEqual({
      nonce: "test-nonce",
      response_uri: "https://verifier.av.org",
      response_type: "vp_token",
      response_mode: "direct_post",
      client_id: "test",
      state: "test-state",
      dcql_query: {
        credentials: [
          {
            id: "proof_of_age",
            format: "mso_mdoc",
            meta: {
              doctype_value: "eu.europa.ec.av.1",
            },
            claims: [
              {
                path: ["eu.europa.ec.av.1", "age_over_18"],
              },
            ],
          },
        ],
      },
    });
  });

  it("should throw InvalidQRCodeError for invalid QR Code URL", () => {
    expect(() => startFlowFromQR(new URL("test://"))).toThrow(ValidationFailed);
  });

  it("should throw InvalidQRCodeError for invalid response_type", () => {
    expect(() =>
      startFlowFromQR(new URL(QR_URL_UNSUPPORTED_RESPONSE_TYPE))
    ).toThrow(ValidationFailed);
  });

  it("should throw InvalidQRCodeError for invalid response_mode", () => {
    expect(() =>
      startFlowFromQR(new URL(QR_URL_UNSUPPORTED_RESPONSE_MODE))
    ).toThrow(ValidationFailed);
  });

  it("should throw InvalidQRCodeError for missing mandatory field", () => {
    expect(() =>
      startFlowFromQR(new URL(QR_URL_MISSING_MANDATORY_FIELD))
    ).toThrow(ValidationFailed);
  });
});
