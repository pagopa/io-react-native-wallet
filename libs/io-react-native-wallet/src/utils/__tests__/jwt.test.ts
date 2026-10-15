import { IoWalletError } from "../errors";
import { getExpirationTime } from "../jwt";

describe("getExpirationTime", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const now = Date.parse("2026-01-01T00:00:00Z") / 1000;

  it.each([
    ["5m", now + 300],
    ["5min", now + 300],
    ["1h", now + 3600],
    ["2 hours", now + 7200],
    ["30s", now + 30],
    ["1d", now + 86400],
  ])("parses the time span %s", (span, expected) => {
    expect(getExpirationTime(span)).toEqual(expected);
  });

  it("returns a timestamp as is", () => {
    expect(getExpirationTime(1234)).toEqual(1234);
  });

  it("throws on invalid time spans", () => {
    expect(() => getExpirationTime("soon")).toThrow(IoWalletError);
  });
});
