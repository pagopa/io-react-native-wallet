import { IoWalletError, UnexpectedStatusCodeError } from "./errors";
import { Logger, LogLevel } from "./logging";

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
        `Http request failed. Expected ${status}, got ${res.status}, url: ${res.url}`,
      );
      throw new ErrorClass({
        message: `Http request failed. Expected ${status}, got ${res.status}, url: ${res.url}`,
        reason: await parseRawHttpResponse(res), // Pass the response body as reason so the original error can surface
        statusCode: res.status,
      });
    }
    return res;
  };

/**
 * Utility function to parse a raw HTTP response as JSON if supported, otherwise as text.
 */
export const parseRawHttpResponse = <T extends Record<string, unknown>>(
  response: Response,
) =>
  response.headers.get("content-type")?.includes("application/json")
    ? (response.json() as Promise<T>)
    : response.text();

// extract a type from an async function output
// helpful to bind the input of a function to the output of another
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Out<FN> = FN extends (...args: any[]) => Promise<unknown>
  ? Awaited<ReturnType<FN>>
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FN extends (...args: any[]) => any
    ? ReturnType<FN>
    : never;

/**
 * TODO [SIW-1310]: replace this function with a cryptographically secure one.
 * @param size - The size of the array in bytes
 * @returns An array of the given size filled with random bytes
 */
export const generateRandomBytes = (size: number) =>
  Uint8Array.from({ length: size }, () => Math.floor(Math.random() * 256));

export const safeJsonParse = <T>(text: string, withDefault?: T): null | T => {
  try {
    return JSON.parse(text);
  } catch {
    return withDefault ?? null;
  }
};

export function assert(
  condition: unknown,
  msg = "Assertion failed",
): asserts condition {
  if (!condition) {
    throw new IoWalletError(msg);
  }
}
