import { IoWalletError } from "./errors";

/**
 * Check if a response is in the expected status, other
 * @param status The expected status
 * @returns The given response object
 */
export const hasStatus =
  (status: number) =>
  async (res: Response): Promise<Response> => {
    if (res.status !== status) {
      throw new IoWalletError(
        `Http request failed. Expected ${status}, got ${res.status}, url: ${
          res.url
        } with response: ${await res.text()}`
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

export const generateRandomAlphaNumericString = (size: number) =>
  Array.from(Array(size), () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("");
