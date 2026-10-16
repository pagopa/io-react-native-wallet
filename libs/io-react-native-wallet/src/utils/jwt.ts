import { IoWalletError } from "./errors";

export interface JwtHeader {
  [propName: string]: unknown;
  alg?: never;
  crit?: string[];
  cty?: string;
  jku?: string;
  jwk?: { [propName: string]: unknown; kty: string };
  kid?: string;
  typ?: string;
  x5c?: string[];
  x5t?: string;
  x5u?: string;
}

/**
 * Registered JWT claims (RFC 7519), any other claim may also be present.
 */
export interface JwtPayload {
  [propName: string]: unknown;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  iss?: string;
  jti?: string;
  nbf?: number;
  sub?: string;
}

const UNITS_IN_SECONDS: Record<string, number> = {
  d: 86400,
  h: 3600,
  m: 60,
  s: 1,
  w: 604800,
  y: 31557600,
};

const TIME_SPAN_REGEX =
  /^(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)$/i;

/**
 * Get the expiration time (in seconds since the epoch) from a timestamp or a time span.
 * A number is interpreted as a timestamp in seconds.
 * A string is a time span (e.g. "5min", "2 hours") added to the current timestamp.
 */
export const getExpirationTime = (expirationTime: number | string): number => {
  if (typeof expirationTime === "number") return expirationTime;
  const [, value, unit] = TIME_SPAN_REGEX.exec(expirationTime) ?? [];
  const seconds = unit && UNITS_IN_SECONDS[unit.charAt(0).toLowerCase()];
  if (!value || !seconds) {
    throw new IoWalletError(`Invalid time period format: ${expirationTime}`);
  }
  return (
    Math.floor(Date.now() / 1000) + Math.round(parseFloat(value) * seconds)
  );
};
