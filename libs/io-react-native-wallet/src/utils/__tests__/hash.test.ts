import { createHash } from "crypto";

import { sha256ToBase64Url } from "../hash";
import { base64ToBase64Url } from "../jwt";

describe("sha256ToBase64Url", () => {
  it.each([
    ["abc", "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0"],
    ["", "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"],
    // Non-ASCII input is hashed as UTF-8
    ["é", "SplVfkAzw1Od4utlRyAXytX5VX96BiWgnxw_biumnEw"],
  ])("returns the base64url SHA-256 digest of %p", async (input, expected) => {
    await expect(sha256ToBase64Url(input)).resolves.toBe(expected);
  });

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
