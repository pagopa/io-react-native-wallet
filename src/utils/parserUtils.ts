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

        out[disc.key as string] = resolveNestedDisclosureValue(
          disclosures,
          disc.value
        );
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

/**
 * Retrieves the "raw" disclosure value for a given claim path.
 * Path matching is always performed only on the top-level key.
 *
 * @param disclosures - All available disclosures
 * @param path - Claim path from metadata (e.g. ["place_of_birth"])
 * @returns The raw unresolved disclosure value, or undefined
 */
export function findValueForPath(
  disclosures: SdDisclosure[],
  path: (string | number | null)[]
): any {
  const [rootKey] = path;
  if (typeof rootKey !== "string") return undefined;

  const match = disclosures.find((d) => d.key === rootKey);
  return match ? match.value : undefined;
}

/**
 * Inserts a parsed claim entry into the final output object,
 * respecting the full metadata path.
 *
 * @param out - Root output object to mutate
 * @param path - The metadata path
 * @param entry - Parsed claim node
 */
export function assignPath(
  out: Record<string, unknown>,
  path: (string | number)[],
  entry: {
    value: unknown;
    name: Record<string, string>;
  }
): void {
  if (path.length === 0) return;

  let cursor: Record<string, unknown> = out;

  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];

    if (segment === undefined || segment === null) continue;

    const current = cursor[segment];

    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current)
    ) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  const last = path[path.length - 1];
  if (last !== undefined && last !== null) {
    cursor[last] = entry;
  }
}
