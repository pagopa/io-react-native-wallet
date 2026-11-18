export const isDefined = <T>(x: "" | null | T | undefined): x is T =>
  Boolean(x);
