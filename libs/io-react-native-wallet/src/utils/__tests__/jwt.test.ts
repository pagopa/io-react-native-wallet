import { JWT } from "@pagopa/io-react-native-jwt";
import { createHash } from "crypto";

import type { JWK } from "../jwk";

import {
  base64ToBase64Url,
  base64UrlToBase64,
  cryptoToJwtSigner,
  sha256ToBase64Url,
} from "../jwt";

const publicKey: JWK = {
  crv: "P-256",
  kty: "EC",
  x: "x-value",
  y: "y-value",
};

const decodeSegment = (segment: string) =>
  JSON.parse(Buffer.from(segment, "base64url").toString());

describe("cryptoToJwtSigner", () => {
  it("maps getSignature to sign and delegates getPublicKey", async () => {
    const getPublicKey = jest.fn().mockResolvedValue(publicKey);
    const getSignature = jest.fn().mockResolvedValue("signature");
    const signer = cryptoToJwtSigner({ getPublicKey, getSignature });

    await expect(signer.getPublicKey()).resolves.toEqual(publicKey);
    await expect(signer.sign("value")).resolves.toBe("signature");
    expect(getSignature).toHaveBeenCalledWith("value");
  });

  it("propagates signing failures", async () => {
    const signer = cryptoToJwtSigner({
      getPublicKey: jest.fn().mockResolvedValue(publicKey),
      getSignature: jest.fn().mockRejectedValue(new Error("sign failed")),
    });

    await expect(signer.sign("value")).rejects.toThrow("sign failed");
  });

  it("lets JWT sign the header and payload with the crypto context", async () => {
    const getSignature = jest.fn().mockResolvedValue("c2ln");

    const jwt = await new JWT(
      cryptoToJwtSigner({
        getPublicKey: jest.fn().mockResolvedValue(publicKey),
        getSignature,
      }),
    )
      .setProtectedHeader({ typ: "test+jwt" })
      .setPayload({ foo: "bar" })
      .sign();

    const [header = "", payload = ""] = jwt.split(".");
    expect(decodeSegment(header)).toEqual({ alg: "ES256", typ: "test+jwt" });
    expect(decodeSegment(payload)).toEqual({ foo: "bar" });
    expect(getSignature).toHaveBeenCalledWith(`${header}.${payload}`);
  });
});

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
