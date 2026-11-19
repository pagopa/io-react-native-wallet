import { createHash } from "crypto";

import {
  base64ToBase64Url,
  base64UrlToBase64,
  sha256ToBase64Url,
} from "../jwt";

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

describe("sha256ToBase64Url", () => {
  it.each([
    ["abc", "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0"],
    ["", "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"],
    // Non-ASCII input is hashed as UTF-8, as the v2 native implementation did
    ["é", "SplVfkAzw1Od4utlRyAXytX5VX96BiWgnxw_biumnEw"],
  ])("returns the base64url SHA-256 digest of %p", async (input, expected) => {
    await expect(sha256ToBase64Url(input)).resolves.toBe(expected);
  });

  // v2 delegated to native code (CC_SHA256 on iOS, MessageDigest on Android):
  // UTF-8 bytes -> SHA-256 -> padded base64, then converted to base64url.
  // Node's crypto follows the same steps, so it acts as the reference implementation.
  const nativeEquivalent = (input: string) =>
    base64ToBase64Url(
      createHash("sha256").update(input, "utf8").digest("base64"),
    );

  it.each([
    "a",
    " ",
    "\n\t\r",
    "ñandú àèìòù ß",
    "日本語のテキスト",
    "emoji 😀👍🏽 and flags 🇮🇹",
    "WyJzYWx0IiwgImdpdmVuX25hbWUiLCAiTWFyaW8iXQ",
    JSON.stringify({ crv: "P-256", kty: "EC", x: "abc", y: "def" }),
    "x".repeat(10_000),
  ])("matches the v2 native implementation for %p", async (input) => {
    await expect(sha256ToBase64Url(input)).resolves.toBe(
      nativeEquivalent(input),
    );
  });

  it("matches the v2 native implementation for every single byte value", async () => {
    for (let code = 0; code < 256; code++) {
      const input = String.fromCharCode(code);
      await expect(sha256ToBase64Url(input)).resolves.toBe(
        nativeEquivalent(input),
      );
    }
  });
});
