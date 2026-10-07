export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const keyBy = <T, K extends keyof T>(array: T[], key: K) =>
  array.reduce((acc, item) => {
    acc.set(item[key], item);
    return acc;
  }, new Map<T[K], T>());

export const groupBy = <T, K extends keyof T>(array: T[], key: K) =>
  array.reduce((acc, item) => {
    const k = item[key];
    acc.set(k, [...(acc.get(k) ?? []), item]);
    return acc;
  }, new Map<T[K], T[]>());
