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

/**
 * Repeatedly checks a condition function until it returns true,
 * then resolves the returned promise. If the condition function does not return true
 * within the specified timeout, the promise is rejected.
 *
 * @param conditionFunction - A function that returns a boolean value.
 *                            The promise resolves when this function returns true.
 * @param timeout - An optional timeout in seconds. The promise is rejected if the
 *                  condition function does not return true within this time.
 * @returns A promise that resolves once the conditionFunction returns true or rejects if timed out.
 */
export const until = (
  conditionFunction: () => boolean,
  timeout?: number
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (conditionFunction()) {
        resolve();
      } else if (
        timeout !== undefined &&
        Date.now() - start >= timeout * 1000
      ) {
        reject(new Error("Timeout exceeded"));
      } else {
        setTimeout(poll, 400);
      }
    };

    poll();
  });
