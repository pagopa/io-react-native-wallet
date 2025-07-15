import { IoWalletError, UnexpectedStatusCodeError } from "./errors";
import { sha256 } from "js-sha256";

/**
 * Check if a response is in the expected status, otherwise throw an error
 * @param status - The expected status
 * @param customError - A custom error compatible with {@link UnexpectedStatusCodeError}
 * @throws UnexpectedStatusCodeError if the status is different from the one expected
 * @returns The given response object
 */
export const hasStatusOrThrow =
  (status: number, customError?: typeof UnexpectedStatusCodeError) =>
  async (res: Response): Promise<Response> => {
    if (res.status !== status) {
      const ErrorClass = customError ?? UnexpectedStatusCodeError;
      throw new ErrorClass({
        message: `Http request failed. Expected ${status}, got ${res.status}, url: ${res.url}`,
        statusCode: res.status,
        reason: await parseRawHttpResponse(res), // Pass the response body as reason so the original error can surface
      });
    }
    return res;
  };

/**
 * Utility function to parse a raw HTTP response as JSON if supported, otherwise as text.
 */
export const parseRawHttpResponse = <T extends Record<string, unknown>>(
  response: Response
) =>
  response.headers.get("content-type")?.includes("application/json")
    ? (response.json() as Promise<T>)
    : response.text();

// extract a type from an async function output
// helpful to bind the input of a function to the output of another
export type Out<FN> = FN extends (...args: any[]) => Promise<any>
  ? Awaited<ReturnType<FN>>
  : FN extends (...args: any[]) => any
    ? ReturnType<FN>
    : never;

/**
 * TODO [SIW-1310]: replace this function with a cryptographically secure one.
 * @param size - The size of the string to generate
 * @returns A random alphanumeric string of the given size
 */
export const generateRandomAlphaNumericString = (size: number) =>
  Array.from(Array(size), () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("");

/**
 * Get the hash of a credential without discloures.
 * A credential is a string like `header.body.sign~sd1~sd2....` where `~` is the separator between the credential and the discloures.
 * @param credential - The credential to hash
 * @returns The hash of the credential without discloures
 */
export const getCredentialHashWithouDiscloures = async (
  credential: string
): Promise<string> => {
  const tildeIndex = credential.indexOf("~");
  if (tildeIndex === -1) {
    throw new IoWalletError("Invalid credential format");
  }
  return sha256(credential.slice(0, tildeIndex));
};

export const safeJsonParse = <T>(text: string, withDefault?: T): T | null => {
  try {
    return JSON.parse(text);
  } catch (_) {
    return withDefault ?? null;
  }
};

/**
 * Helper function to insert a value at a specified object path
 * @param object The object in which to insert the value
 * @param path The path at which the value should be inserted
 * @param value The value to insert at the specified path
 * @returns A new object with the property at path set to value, on-path objects are recreated
 */
export function pathInsert(object: any, path: string[], value: any) : any {
  if (path.length === 1) {
    return {
      ...object,
      [path[0]!] : value
    }
  }
  return {
    ...object,
    [path[0]!] : pathInsert(path[0]! in object ? object[path[0]!] : {}, path.slice(1), value)
  }
}
