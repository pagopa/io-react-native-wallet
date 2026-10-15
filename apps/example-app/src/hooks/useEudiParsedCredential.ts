import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import { useEffect, useMemo, useState } from "react";

import type { EudiCredential } from "../store/reducers/eudi/credentials";

/** Claims holding the holder picture, in mdoc and SD-JWT VC credentials */
const PORTRAIT_CLAIMS = ["portrait", "picture"];

/**
 * Parsed credentials by raw credential, so that a credential parsed by a screen is immediately
 * available to the next one, e.g. to show the same card during the shared element transition.
 */
const parsedCredentials = new Map<
  string,
  Eudi.CredentialIssuance.ParsedCredential
>();

/** Encodes binary data, used by mdoc for pictures, as base64 */
const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

/** Base64 prefixes of the supported image formats, in base64url (as returned for mdoc) and base64 */
const IMAGE_BASE64_PREFIXES: Record<string, string> = {
  "/9j/": "image/jpeg",
  _9j_: "image/jpeg",
  iVBOR: "image/png",
};

/** Returns a displayable image URI from binary data, a base64(url) string or a data URI */
const toImageUri = (value: unknown) => {
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

/** Claims holding the document expiry date, in mdoc namespaces and SD-JWT VC PIDs */
const EXPIRY_CLAIMS = ["expiry_date", "date_of_expiry"];

/** Returns a date from a claim value, either a date or an ISO date string */
const toDate = (value: unknown) => {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : undefined;
  return date && !isNaN(date.getTime()) ? date : undefined;
};

/**
 * Returns when a credential expires: the `exp` of an SD-JWT VC, otherwise the document expiry date
 * claim, at the top level or inside an mdoc namespace.
 */
const getExpiry = (claims: Record<string, unknown>) => {
  if (typeof claims.exp === "number") {
    return new Date(claims.exp * 1000);
  }
  const scopes = [
    claims,
    ...Object.values(claims).filter(
      (v): v is Record<string, unknown> =>
        typeof v === "object" && v !== null && !(v instanceof Date),
    ),
  ];
  for (const scope of scopes) {
    for (const name of EXPIRY_CLAIMS) {
      const date = toDate(scope[name]);
      if (date) return date;
    }
  }
  return undefined;
};

/** Whether a claim holds the holder picture */
export const isPortraitClaim = (
  claim: Eudi.CredentialIssuance.DisplayedClaim,
) => PORTRAIT_CLAIMS.includes(String(claim.path[claim.path.length - 1]));

/**
 * Parses an obtained EUDI credential and lists its claims with their display names.
 * @returns The parsed credential, its displayed claims, its holder picture and expiry when available and the parsing error
 */
export const useEudiParsedCredential = (credential?: EudiCredential) => {
  const raw = credential?.credential;
  const format = credential?.format;
  const [parsed, setParsed] = useState(() =>
    raw ? parsedCredentials.get(raw) : undefined,
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!raw || !format) return;
    const cached = parsedCredentials.get(raw);
    if (cached) {
      setParsed(cached);
      return;
    }
    Eudi.CredentialIssuance.parseCredential(raw, format)
      .then((result) => {
        parsedCredentials.set(raw, result);
        setParsed(result);
      })
      .catch((e: unknown) => setError(String(e)));
  }, [format, raw]);

  const claimsDisplay = credential?.display?.claims;
  const claims = useMemo(
    () =>
      parsed && format
        ? Eudi.CredentialIssuance.getDisplayedClaims(
            parsed.claims,
            format,
            claimsDisplay,
          )
        : [],
    [claimsDisplay, format, parsed],
  );

  const portrait = useMemo(() => {
    const claim = claims.find(isPortraitClaim);
    const uri = claim && toImageUri(claim.value);
    return claim && uri ? { label: claim.label, uri } : undefined;
  }, [claims]);

  const expiresAt = useMemo(() => parsed && getExpiry(parsed.claims), [parsed]);

  return { claims, error, expiresAt, parsed, portrait };
};
