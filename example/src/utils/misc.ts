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
  timeoutSeconds?: number
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (conditionFunction()) {
        resolve();
      } else if (
        timeoutSeconds !== undefined &&
        Date.now() - start >= timeoutSeconds * 1000
      ) {
        reject(new Error("Timeout exceeded"));
      } else {
        setTimeout(poll, 400);
      }
    };

    poll();
  });

/**
 * Creates a promise that waits until the provided signal is aborted.
 * @returns {Object} An object with `listen` and `remove` methods to handle subscribing and unsubscribing.
 */
export const createAbortPromiseFromSignal = (signal: AbortSignal) => {
  let listener: () => void;
  return {
    listen: () =>
      new Promise<"OPERATION_ABORTED">((resolve) => {
        if (signal.aborted) {
          return resolve("OPERATION_ABORTED");
        }
        listener = () => resolve("OPERATION_ABORTED");
        signal.addEventListener("abort", listener);
      }),
    remove: () => signal.removeEventListener("abort", listener),
  };
};

export const isDefined = <T>(x: T | undefined | null | ""): x is T =>
  Boolean(x);
