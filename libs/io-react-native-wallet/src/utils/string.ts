import { isObject } from "./object";

/**
 * Italian codice fiscale, including omocodia.
 * Anchors from the source validator are omitted so matches can be found inside longer strings.
 * Built per call so a shared `/g` regex cannot leak `lastIndex`.
 *
 * @see https://gist.github.com/matpag/242557b056865aa2c8e0edb27bbb6822#file-italian_tax_code_regex-txt
 */
const ITALIAN_FISCAL_CODE_SOURCE =
  "(?:[A-Z][AEIOUX][AEIOUX]|[B-DF-HJ-NP-TV-Z]{2}[A-Z]){2}(?:[\\dLMNP-V]{2}(?:[A-EHLMPR-T](?:[04LQ][1-9MNP-V]|[15MR][\\dLMNP-V]|[26NS][0-8LMNP-U])|[DHPS][37PT][0L]|[ACELMRT][37PT][01LM]|[AC-EHLMPR-T][26NS][9V])|(?:[02468LNQSU][048LQU]|[13579MPRTV][26NS])B[26NS][9V])(?:[A-MZ][1-9MNP-V][\\dLMNP-V]{2}|[A-M][0L](?:[1-9MNP-V][\\dLMNP-V]|[0L][1-9MNP-V]))[A-Z]";

const FISCAL_CODE_MASK = "*".repeat(16);

/**
 * Replaces Italian fiscal codes with 16 asterisks.
 * Walks strings, arrays, and nested objects; other values pass through.
 *
 * @example
 * ```ts
 * anonymizeString("User LVLDAA85T50G702B not found");
 * // "User **************** not found"
 *
 * anonymizeString({ tax_id: "LVLDAA85T50G702B" });
 * // { tax_id: "****************" }
 * ```
 */
export const anonymizeString = <T>(value: T): T => {
  if (typeof value === "string") {
    return value.replace(
      new RegExp(ITALIAN_FISCAL_CODE_SOURCE, "gi"),
      FISCAL_CODE_MASK,
    ) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => anonymizeString(item)) as T;
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        anonymizeString(nested),
      ]),
    ) as T;
  }

  return value;
};

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
  percentage = 60,
  obfuscatedChar = "*",
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
