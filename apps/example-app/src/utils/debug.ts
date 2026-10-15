import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";

/** A compact JWS, made of three base64url parts, such as a JWT or the issuer-signed part of an SD-JWT */
const JWT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]*$/;

/** Decodes a base64url UTF-8 string */
const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return decodeURIComponent(
    Array.from(
      binary,
      (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
    ).join(""),
  );
};

/** Decodes the header and payload of a JWT, without verifying its signature */
const decodeJwtParts = (jwt: string) => {
  const { payload, protectedHeader } = decodeJwt(jwt);
  return { header: protectedHeader, payload };
};

/**
 * Decodes a JWT or an SD-JWT (`<jwt>~<disclosure>~...~<optional KB-JWT>`).
 * @returns The decoded token, or `undefined` if the value is not a token
 */
const decodeToken = (value: string) => {
  const [jwt = "", ...rest] = value.split("~");
  if (!JWT_REGEX.test(jwt)) {
    return undefined;
  }
  try {
    if (rest.length === 0) {
      return decodeJwtParts(jwt);
    }
    const keyBindingJwt = rest[rest.length - 1];
    return {
      ...decodeJwtParts(jwt),
      disclosures: rest
        .slice(0, -1)
        .map((disclosure) => JSON.parse(decodeBase64Url(disclosure))),
      ...(keyBindingJwt && { keyBindingJwt: decodeJwtParts(keyBindingJwt) }),
    };
  } catch {
    return undefined;
  }
};

/**
 * Replaces every JWT and SD-JWT in debug data with its decoded header, payload and disclosures,
 * so that tokens can be read without an external decoder.
 */
export const decodeDebugTokens = (value: unknown): unknown => {
  if (typeof value === "string") {
    return decodeToken(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map(decodeDebugTokens);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        decodeDebugTokens(item),
      ]),
    );
  }
  return value;
};
