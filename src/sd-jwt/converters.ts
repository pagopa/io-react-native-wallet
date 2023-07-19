import type { Disclosure } from "./types";

export function getValueFromDisclosures(
  disclosures: Disclosure[],
  claimName: string
) {
  const value = disclosures.find(([, name]) => name === claimName)?.[2];
  // value didn't found, we return nothing
  if (!value) {
    return undefined;
  }
  // value is not a string, it's probably fine
  if (typeof value !== "string") {
    return value;
  }
  // value is a string, we try to parse it
  // maybe it's a serialized object
  try {
    return JSON.parse(value);
  } catch (error) {
    // It's definitely a string
    return value;
  }
}
