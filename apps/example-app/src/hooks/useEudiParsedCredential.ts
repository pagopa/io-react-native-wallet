import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import { useEffect, useMemo, useState } from "react";

import type { EudiCredential } from "../store/reducers/eudi/credentials";

import { toImageUri } from "../utils/eudiClaims";

/** Claims holding the holder picture, in mdoc and SD-JWT VC credentials */
const PORTRAIT_CLAIMS = ["portrait", "picture"];

/**
 * Parsed credentials by raw credential, so that a credential parsed by a screen is immediately
 * available to the next one, e.g. to show the same card without waiting for the parsing.
 */
const parsedCredentials = new Map<
  string,
  Eudi.CredentialIssuance.ParsedCredential
>();

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
 * Returns when a credential expires: the end of its validity, otherwise the document expiry date
 * claim, at the top level or inside an mdoc namespace.
 */
const getExpiry = ({
  claims,
  validity,
}: Eudi.CredentialIssuance.ParsedCredential) => {
  if (validity.validUntil) {
    return validity.validUntil;
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

  const expiresAt = useMemo(() => parsed && getExpiry(parsed), [parsed]);

  return { claims, error, expiresAt, parsed, portrait };
};
