import { IoWalletError } from "./errors";

/**
 * Convert a base64 string to base64url, removing the padding.
 */
export const base64ToBase64Url = (encoded: string): string =>
  encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

/**
 * Convert a base64url string to base64, restoring the padding.
 * @throws if the input length is not valid for base64url.
 */
export const base64UrlToBase64 = (encoded: string): string => {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad === 1) {
    throw new IoWalletError(
      "Invalid base64url string: wrong length to determine padding",
    );
  }
  return pad ? base64 + "=".repeat(4 - pad) : base64;
};
