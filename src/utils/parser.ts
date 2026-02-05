/**
 * Helper to determine if two paths are equal (Supports string | number | null)
 */
export const isPathEqual = (
  pathA: (string | number | null)[],
  pathB: (string | number | null)[]
): boolean =>
  pathA.length === pathB.length && pathA.every((v, i) => v === pathB[i]);
/**
 * Helper to check if prefix is the start of fullPath
 */
export const isPrefixOf = (
  prefix: (string | number | null)[],
  fullPath: (string | number | null)[]
): boolean => {
  if (prefix.length >= fullPath.length) return false;
  return prefix.every((v, i) => v === fullPath[i]);
};
