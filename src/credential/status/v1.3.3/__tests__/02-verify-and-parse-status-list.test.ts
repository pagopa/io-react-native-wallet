import { verify } from "@pagopa/io-react-native-jwt";
import { verifyAndParseStatusList } from "../02-verify-and-parse-status-list";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  ...jest.requireActual("@pagopa/io-react-native-jwt"),
  verify: jest.fn(),
}));

describe("verifyAndParseStatusList", () => {
  const verifyMock = verify as jest.MockedFunction<typeof verify>;
  const statusListPayload = {
    sub: "https://example/status-list",
    iss: "https://example/issuer",
    iat: 1778849463,
    ttl: 3600,
    status_list: {
      bits: 4,
      lst: "H4sIAAAAAAAEExNQMNigAABBpDD9BQAAAA",
      aggregation_uri: "https://example/status-list-aggregation",
    },
    extra_claim: "kept",
  };

  beforeEach(() => {
    verifyMock.mockClear();
  });

  it("should verify and parse a status list token payload", async () => {
    const statusListJwt = makeJwt(statusListPayload);

    await expect(verifyAndParseStatusList([], statusListJwt)).resolves.toEqual(
      statusListPayload
    );
    expect(verifyMock).toHaveBeenCalledWith(statusListJwt, []);
  });

  it("should validate documented required status list payload fields", async () => {
    const payloadWithoutIat = Object.fromEntries(
      Object.entries(statusListPayload).filter(([key]) => key !== "iat")
    );

    await expect(
      verifyAndParseStatusList([], makeJwt(payloadWithoutIat))
    ).rejects.toThrow();
    expect(verifyMock).toHaveBeenCalledTimes(1);
  });
});

function makeJwt(payload: unknown) {
  return [
    base64url({ typ: "statuslist+jwt", alg: "ES256" }),
    base64url(payload),
    "signature",
  ].join(".");
}

function base64url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
