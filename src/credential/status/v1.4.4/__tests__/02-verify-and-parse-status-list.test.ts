import { verify } from "@pagopa/io-react-native-jwt";

import { verifyAndParseStatusList } from "../02-verify-and-parse-status-list";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  ...jest.requireActual("@pagopa/io-react-native-jwt"),
  verify: jest.fn(),
}));

describe("verifyAndParseStatusList", () => {
  const verifyMock = verify as jest.MockedFunction<typeof verify>;
  const statusListPayload = {
    iat: 1778849463,
    iss: "https://example/issuer",
    status_list: {
      aggregation_uri: "https://example/status-list-aggregation",
      bits: 4,
      lst: "H4sIAAAAAAAEExNQMNigAABBpDD9BQAAAA",
    },
    sub: "https://example/status-list",
    ttl: 3600,
  };
  const statusListPayloadWithExtraClaim = {
    ...statusListPayload,
    extra_claim: "stripped",
  };

  beforeEach(() => {
    verifyMock.mockClear();
  });

  it("should verify and parse a status list token payload", async () => {
    const statusListJwt = makeJwt(statusListPayloadWithExtraClaim);

    await expect(verifyAndParseStatusList([], statusListJwt)).resolves.toEqual(
      statusListPayload,
    );
    expect(verifyMock).toHaveBeenCalledWith(statusListJwt, []);
  });

  it("should validate documented required status list payload fields", async () => {
    const payloadWithoutIat = Object.fromEntries(
      Object.entries(statusListPayload).filter(([key]) => key !== "iat"),
    );

    await expect(
      verifyAndParseStatusList([], makeJwt(payloadWithoutIat)),
    ).rejects.toThrow();
    expect(verifyMock).toHaveBeenCalledTimes(1);
  });
});

function base64url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeJwt(payload: unknown) {
  return [
    base64url({ alg: "ES256", typ: "statuslist+jwt" }),
    base64url(payload),
    "signature",
  ].join(".");
}
