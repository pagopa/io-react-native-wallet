import { IoWalletError, UnexpectedStatusCodeError } from "./errors";
import { sha256 } from "js-sha256";
import { LogLevel, Logger } from "./logging";

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
      Logger.log(
        LogLevel.ERROR,
        `Http request failed. Expected ${status}, got ${res.status}, url: ${res.url}`
      );
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
 * TODO [SIW-1310]: replace this function with a cryptographically secure one.
 * @param size - The size of the array in bytes
 * @returns An array of the given size filled with random bytes
 */
export const generateRandomBytes = (size: number) =>
  Uint8Array.from({ length: size }, () => Math.floor(Math.random() * 256));

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

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function assert(
  condition: unknown,
  msg: string = "Assertion failed"
): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}
