import { Buffer } from "buffer";

/**
 * Randomly obfuscates characters in a string by replacing them with a specified character.
 *
 * @example
 * ```ts
 * const value = "1234567890";
 * const obfuscated = obfuscateString(value, 60, "*");
 * // Could output: "12**5*78**"
 * ```
 *
 * @param value - The input string to obfuscate
 * @param percentage - Percentage of characters to obfuscate (0-100). Defaults to 60
 * @param obfuscatedChar - Character used for obfuscation. Defaults to "*"
 * @returns The obfuscated string with random characters replaced
 */
export const obfuscateString = (
  value: string,
  percentage: number = 60,
  obfuscatedChar: string = "*"
): string => {
  if (!value) {
    return "";
  }

  // Ensure percentage is between 0 and 100
  const safePercentage = Math.max(0, Math.min(100, percentage));

  // Calculate number of characters to obfuscate
  const charsToObfuscate = Math.floor((value.length * safePercentage) / 100);

  // Convert string to array for manipulation
  const chars = value.split("");

  // Get random positions to obfuscate
  const positions = Array.from({ length: value.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, charsToObfuscate);

  // Replace characters at random positions
  positions.forEach((pos) => {
    chars[pos] = obfuscatedChar;
  });

  return chars.join("");
};

/**
 * Converts a base64 string to a Base64 URL-encoded string.
 *
 * @param byteString - The input string in base64 format.
 * @returns The Base64 URL-encoded string.
 */
export const base64ToBase64Url = (base64: string): string => {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/[=]+$/, "");
};

/**
 * Converts an UTF-8 string to a Base64 URL-encoded string.
 *
 * @param utf8 - The input string in utf8 format.
 * @returns The Base64 URL-encoded string.
 */
export const utf8ToB64Url = (utf8: string): string => {
  return base64ToBase64Url(Buffer.from(utf8, "utf-8").toString("base64"));
};
