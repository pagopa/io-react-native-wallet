/**
 * Helper to determine if two paths are equal (Supports string | number | null)
 */
export const isPathEqual = (
  pathA: (null | number | string)[],
  pathB: (null | number | string)[],
): boolean =>
  pathA.length === pathB.length && pathA.every((v, i) => v === pathB[i]);
/**
 * Helper to check if prefix is the start of fullPath
 */
export const isPrefixOf = (
  prefix: (null | number | string)[],
  fullPath: (null | number | string)[],
): boolean => {
  if (prefix.length >= fullPath.length) return false;
  return prefix.every((v, i) => v === fullPath[i]);
};
