type ScenarioError = [string];
type ScenarioResult = [null, string];
export type ScenarioRunner = () => Promise<unknown>;

export const error = (e: unknown): ScenarioError => {
  return [
    typeof e === "string"
      ? e
      : typeof e === "undefined"
      ? "unknown error"
      : e instanceof Error
      ? e.message
      : Object.prototype.toString.call(e),
  ];
};

export const result = (e: string | object): ScenarioResult => {
  return [null, typeof e === "string" ? e : JSON.stringify(e)];
};

export const toResultOrReject = async ([err, value]:
  | ScenarioError
  | ScenarioResult) =>
  err
    ? Promise.reject(err)
    : !value
    ? Promise.reject("empty attestation")
    : value;

export const assert = <T extends unknown>(
  value: T,
  comparison: (value: T) => boolean
) => {
  if (comparison(value)) {
    return true;
  }
  throw new Error(`Cannot assert ${JSON.stringify(value)}`);
};

export const assertEquals = <T extends string | number | boolean | undefined>(
  value: T,
  comparisonValue: T
) => {
  if (value === comparisonValue) {
    return true;
  }
  throw new Error(`Cannot assert ${value}, expecting ${comparisonValue}`);
};
