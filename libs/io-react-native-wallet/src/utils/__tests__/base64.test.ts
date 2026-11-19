import { base64ToBase64Url, base64UrlToBase64 } from "../base64";

describe("base64ToBase64Url", () => {
  it.each([
    ["a+b/c==", "a-b_c"],
    ["+++///===", "---___"],
    ["a-b_c", "a-b_c"],
    ["", ""],
  ])("converts %p to %p", (input, expected) => {
    expect(base64ToBase64Url(input)).toBe(expected);
  });
});

describe("base64UrlToBase64", () => {
  it.each([
    ["YQ", "YQ=="],
    ["YWI", "YWI="],
    ["YWJj", "YWJj"],
    ["a-b_cw", "a+b/cw=="],
    ["", ""],
  ])("converts %p to %p", (input, expected) => {
    expect(base64UrlToBase64(input)).toBe(expected);
  });

  it.each(["YQ==", "YWI=", "YWJj", "+/+/", "a+b/cw=="])(
    "is the inverse of base64ToBase64Url for %p",
    (input) => {
      expect(base64UrlToBase64(base64ToBase64Url(input))).toBe(input);
    },
  );

  it("throws when the length cannot be a valid base64url string", () => {
    expect(() => base64UrlToBase64("abcde")).toThrow();
  });
});
