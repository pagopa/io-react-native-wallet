export const hasStatus =
  (status: number) =>
  (res: Response): Response => {
    if (res.status !== 200) {
      throw new Error(
        `Http request failed. Expected ${status}, got ${res.status}, url: ${res.url}`
      );
    }
    return res;
  };

// extract a type from an async function output
// helpful to bind the input of a function to the output of another
export type Out<FN> = FN extends (...args: any[]) => Promise<any>
  ? Awaited<ReturnType<FN>>
  : never;
