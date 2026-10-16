import { CBOR } from "@pagopa/io-react-native-iso18013";
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
 * Whether a value looks like a base64url mdoc `IssuerSigned`: a CBOR map of two text keys,
 * the first being `issuerAuth` or `nameSpaces`.
 */
const isMdoc = (value: string) => {
  if (value.length < 100 || !/^[\w-]+$/.test(value)) {
    return false;
  }
  try {
    const head = atob(value.slice(0, 16).replace(/-/g, "+").replace(/_/g, "/"));
    return (
      head.charCodeAt(0) === 0xa2 &&
      head.charCodeAt(1) === 0x6a &&
      /^(issuerAu|nameSpac)/.test(head.slice(2))
    );
  } catch {
    return false;
  }
};

/**
 * Turns the list of issuer-signed items of each namespace into a `{ claim: value }` object,
 * dropping the digest IDs and salts, which only make the claims harder to read.
 */
const compactNameSpaces = (nameSpaces: CBOR.IssuerSigned["nameSpaces"]) =>
  Object.fromEntries(
    Object.entries(nameSpaces).map(([nameSpace, items]) => [
      nameSpace,
      Object.fromEntries(
        items.map(({ elementIdentifier, elementValue }) => [
          elementIdentifier,
          elementValue,
        ]),
      ),
    ]),
  );

/** Decodes an mdoc `IssuerSigned` with the native decoder */
const decodeMdoc = (value: string) =>
  CBOR.decodeIssuerSigned(value)
    .then((issuerSigned) => ({
      ...issuerSigned,
      nameSpaces: compactNameSpaces(issuerSigned.nameSpaces),
    }))
    .catch(() => undefined);

const decodeString = async (value: string) =>
  decodeToken(value) ?? (isMdoc(value) ? await decodeMdoc(value) : undefined);

/**
 * Replaces every JWT, SD-JWT and mdoc in debug data with its decoded content,
 * so that credentials can be read without an external decoder.
 */
export const decodeDebugTokens = async (value: unknown): Promise<unknown> => {
  if (typeof value === "string") {
    return (await decodeString(value)) ?? value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map(decodeDebugTokens));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(value).map(
          async ([key, item]) => [key, await decodeDebugTokens(item)] as const,
        ),
      ),
    );
  }
  return value;
};

/**
 * Keeps only the parts of a value matching a search, case-insensitively: the keys and the
 * primitive values containing the query, with their ancestors. A matching key keeps its whole
 * subtree. Arrays become objects keyed by the original index, so that indexes stay meaningful.
 * @returns The pruned value, or `undefined` if nothing matches
 */
export const filterDebugData = (
  value: unknown,
  query: string,
  key = "",
): unknown => {
  if (key.toLowerCase().includes(query)) {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const matches = Object.entries(value).flatMap(([childKey, child]) => {
      const filtered = filterDebugData(child, query, childKey);
      return filtered === undefined ? [] : [[childKey, filtered] as const];
    });
    return matches.length > 0 ? Object.fromEntries(matches) : undefined;
  }
  return String(value).toLowerCase().includes(query) ? value : undefined;
};
