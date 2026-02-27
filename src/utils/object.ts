export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const keyBy = <T extends Record<string, any>>(
  array: T[],
  key: keyof T
) =>
  array.reduce(
    (acc, item) => {
      acc[item[key]] = item;
      return acc;
    },
    {} as Record<string, T>
  );

export const groupBy = <T extends Record<string, any>>(
  array: T[],
  key: keyof T
) =>
  array.reduce(
    (acc, item) => {
      (acc[item[key]] ??= []).push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
