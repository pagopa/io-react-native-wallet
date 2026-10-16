import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { toBase64 } from "./strings";

/** Base64 prefixes of the supported image formats, in base64url (as returned for mdoc) and base64 */
const IMAGE_BASE64_PREFIXES: Record<string, string> = {
  "/9j/": "image/jpeg",
  _9j_: "image/jpeg",
  iVBOR: "image/png",
};

/** Returns a displayable image URI from binary data, a base64(url) string or a data URI */
export const toImageUri = (value: unknown) => {
  if (value instanceof Uint8Array) {
    return `data:image/jpeg;base64,${toBase64(value)}`;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  if (value.startsWith("data:image")) {
    return value;
  }
  const mimeType = Object.entries(IMAGE_BASE64_PREFIXES).find(([prefix]) =>
    value.startsWith(prefix),
  )?.[1];
  if (!mimeType) {
    return undefined;
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return `data:${mimeType};base64,${base64}${padding}`;
};

/** Turns a claim name such as `expiry_date` into a label such as `Expiry date` */
export const humanize = (key: string) => {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Formats a date, parsing date-only values in the local timezone to avoid a day shift */
const formatDate = (value: string) => {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);
  return date.toLocaleDateString();
};

const isDateString = (value: string) =>
  /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(value);

/** Whether a claim value holds nested claims, such as the parts of an address */
export const isClaimObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof Uint8Array);

/** Formats a claim value without nested claims */
export const formatClaimValue = (value: unknown): string => {
  if (value === null || value === undefined || isClaimObject(value)) {
    return "-";
  }
  if (value instanceof Uint8Array) {
    return `Binary data, ${value.length} bytes`;
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    return isDateString(value) ? formatDate(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map(formatClaimValue).join("\n");
  }
  return String(value);
};

/** Claim nested in another one, with its display name */
export type NestedClaim = {
  label: string;
  path: Eudi.CredentialIssuance.ClaimPath;
  value: unknown;
};

/**
 * Lists the claims nested in a claim value: the members of an object, or the items of a list of
 * objects, numbered after the parent label.
 * @param label - The display name of the parent claim
 * @param labels - The display names by claim path
 * @returns The nested claims, empty for a value without nested claims
 */
export const getNestedClaims = (
  label: string,
  value: unknown,
  path: Eudi.CredentialIssuance.ClaimPath,
  labels: Map<string, string>,
): NestedClaim[] => {
  if (isClaimObject(value)) {
    return Object.entries(value).map(([key, item]) => {
      const itemPath = [...path, key];
      return {
        label: labels.get(itemPath.join("/")) ?? humanize(key),
        path: itemPath,
        value: item,
      };
    });
  }
  if (Array.isArray(value) && value.some(isClaimObject)) {
    return value.map((item, i) => ({
      label: `${label} ${i + 1}`,
      path: [...path, null],
      value: item,
    }));
  }
  return [];
};
