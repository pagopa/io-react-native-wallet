import type { SdDisclosure } from "../credential/offer/types";

/**
 * Builds a map of localized names from the metadata "display" field.
 *
 * @param display - Array of { locale, name } entries
 * @returns A record mapping locale → display name
 */
export function buildName(
  display: { locale: string; name: string }[]
): Record<string, string> {
  return display.reduce((acc, d) => ({ ...acc, [d.locale]: d.name }), {});
}

/**
 * Recursively resolves disclosure-based values.
 *
 * Handles:
 * - Arrays
 * - Nested SD structures: { _sd: ["digest1", ...] }
 * - Digest references in lists: { "...": "digest" }
 *
 * @param disclosures - The list of SD disclosures
 * @param value - The raw value coming from the SD-JWT
 * @returns The fully resolved value
 */
export function resolveNestedDisclosureValue(
  disclosures: SdDisclosure[],
  value: any
): any {
  if (value === null || value === undefined) return value;

  // Array → resolve items
  if (Array.isArray(value)) {
    return value.map((item) => resolveNestedDisclosureValue(disclosures, item));
  }

  // Object
  if (typeof value === "object") {
    // Nested SD structure: { _sd: [...] }
    if (Array.isArray((value as any)._sd)) {
      const out: Record<string, unknown> = {};

      for (const digest of (value as any)._sd) {
        const disc = disclosures.find((d) => d._digest === digest);
        if (!disc) continue;

        const resolved = resolveNestedDisclosureValue(disclosures, disc.value);

        if (
          typeof resolved === "object" &&
          resolved !== null &&
          !Array.isArray(resolved) &&
          Object.keys(resolved).length === 1 &&
          Object.prototype.hasOwnProperty.call(resolved, disc.key as string)
        ) {
          out[disc.key as string] = (resolved as any)[disc.key as string];
        } else {
          out[disc.key as string] = resolved;
        }
      }

      return out;
    }

    // Digest wrapper: { "...": digest }
    if (
      Object.keys(value).length === 1 &&
      Object.prototype.hasOwnProperty.call(value, "...")
    ) {
      const digest = (value as any)["..."];
      const disc = disclosures.find((d) => d._digest === digest);
      if (!disc) return undefined;

      return resolveNestedDisclosureValue(disclosures, disc.value);
    }

    // Normal object → resolve children
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveNestedDisclosureValue(disclosures, v);
    }
    return out;
  }

  // Primitive
  return value;
}
