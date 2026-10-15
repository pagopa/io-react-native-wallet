import type { ClaimPath, CredentialIssuerMetadata } from "./types";

export interface CredentialDisplay {
  backgroundColor?: string;
  /** Claims with their display name, in the order defined by the Credential Issuer */
  claims: { label: string; path: ClaimPath }[];
  issuerName?: string;
  logoUri?: string;
  name: string;
  textColor?: string;
}

export interface DisplayedClaim {
  label: string;
  path: ClaimPath;
  value: unknown;
}

/** SD-JWT VC claims that describe the credential rather than its subject */
const SD_JWT_TECHNICAL_CLAIMS = [
  "_sd_alg",
  "cnf",
  "exp",
  "iat",
  "iss",
  "nbf",
  "status",
  "vct",
  "vct#integrity",
];

const pickLocale = <T extends { locale?: string }>(
  items: T[] | undefined,
  locale: string,
) =>
  items?.find((item) => item.locale?.startsWith(locale)) ??
  items?.find((item) => !item.locale) ??
  items?.[0];

/**
 * Reads how a credential should be displayed from the Credential Issuer Metadata
 * (OpenID4VCI 1.0, Appendix A.1). It falls back to the credential configuration id.
 *
 * @param issuerMetadata - The Credential Issuer Metadata
 * @param credentialConfigurationId - The credential configuration id
 * @param locale - (optional) The preferred locale, defaults to `en`
 * @returns The display information of the credential and its claims
 */
export const getCredentialDisplay = (
  issuerMetadata: CredentialIssuerMetadata,
  credentialConfigurationId: string,
  locale = "en",
): CredentialDisplay => {
  const credentialMetadata =
    issuerMetadata.credential_configurations_supported[
      credentialConfigurationId
    ]?.credential_metadata;
  const display = pickLocale(credentialMetadata?.display, locale);
  const issuerDisplay = pickLocale(issuerMetadata.display, locale);

  return {
    backgroundColor: display?.background_color,
    claims: (credentialMetadata?.claims ?? []).map((claim) => ({
      label:
        pickLocale(claim.display, locale)?.name ??
        String(claim.path[claim.path.length - 1]),
      path: claim.path,
    })),
    issuerName: issuerDisplay?.name,
    logoUri: display?.logo?.uri ?? issuerDisplay?.logo?.uri,
    name: display?.name ?? credentialConfigurationId,
    textColor: display?.text_color,
  };
};

/**
 * Selects a value from the claims following a claims path (OpenID4VCI 1.0, Appendix C):
 * a string selects an object key, a number an array index, `null` all the array elements.
 */
const selectClaim = (value: unknown, path: ClaimPath): unknown => {
  if (path.length === 0 || value === undefined || value === null) {
    return value;
  }
  const [segment, ...rest] = path;
  if (segment === null) {
    return Array.isArray(value)
      ? value.map((item) => selectClaim(item, rest))
      : undefined;
  }
  return selectClaim(
    (value as Record<number | string, unknown>)[segment],
    rest,
  );
};

/**
 * Lists the claims of a parsed credential with their display names.
 *
 * The claims described by the Credential Issuer come first, in its order, followed by the
 * other claims labelled by their name. SD-JWT VC technical claims (e.g. `iss`, `cnf`) are omitted.
 *
 * @param claims - The claims returned by `parseCredential`
 * @param format - The credential format, `mso_mdoc` claims are grouped by namespace
 * @param claimsDisplay - The claims display names, from {@link getCredentialDisplay}
 * @returns The claims to display
 */
export const getDisplayedClaims = (
  claims: Record<string, unknown>,
  format: string,
  claimsDisplay: CredentialDisplay["claims"] = [],
): DisplayedClaim[] => {
  // The depth at which the claims are listed: below the namespace for mdoc
  const depth = format === "mso_mdoc" ? 2 : 1;

  const described = claimsDisplay
    .filter(({ path }) => path.length === depth)
    .map(({ label, path }) => ({
      label,
      path,
      value: selectClaim(claims, path),
    }))
    .filter(({ value }) => value !== undefined);

  const describedKeys = new Set(described.map(({ path }) => path.join("/")));
  const leaves: { path: string[]; value: unknown }[] =
    depth === 2
      ? Object.entries(claims).flatMap(([namespace, items]) =>
          Object.entries(items as Record<string, unknown>).map(
            ([key, value]) => ({ path: [namespace, key], value }),
          ),
        )
      : Object.entries(claims)
          .filter(([key]) => !SD_JWT_TECHNICAL_CLAIMS.includes(key))
          .map(([key, value]) => ({ path: [key], value }));

  const others = leaves
    .filter(({ path }) => !describedKeys.has(path.join("/")))
    .map(({ path, value }) => ({
      label: path[path.length - 1] as string,
      path,
      value,
    }));

  return [...described, ...others];
};
