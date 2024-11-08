import { IoWalletError, UnexpectedStatusCodeError } from "./errors";
import { sha256 } from "js-sha256";

/**
 * Check if a response is in the expected status, other
 * @param status - The expected status
 * @throws {@link UnexpectedStatusCodeError} if the status is different from the one expected
 * @returns The given response object
 */
export const hasStatus =
  (status: number) =>
  async (res: Response): Promise<Response> => {
    if (res.status !== status) {
      const responseBody = await res.text();
      throw new UnexpectedStatusCodeError(
        `Http request failed. Expected ${status}, got ${res.status}, url: ${res.url} with response: ${responseBody}`,
        res.status,
        responseBody
      );
    }
    return res;
  };

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
