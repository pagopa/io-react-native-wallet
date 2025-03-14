import {
  type EntityStatement as EntityStatementType,
  type MetadataPolicy,
} from "./types";

/**
 * Apply metadata policies to an entity's metadata based on its subordinate statement.
 *
 * @param entityMetadata The metadata to apply policies to
 * @param subordinateStatement The subordinate statement containing the policies
 * @returns The metadata with policies applied
 */
export function applyMetadataPolicies(
  entityMetadata: Record<string, unknown>,
  subordinateStatement: EntityStatementType
): Record<string, unknown> {
  const { metadata_policy } = subordinateStatement.payload;
  if (!metadata_policy) {
    return entityMetadata;
  }

  const result: Record<string, unknown> = {};
  for (const [key, policy] of Object.entries(metadata_policy)) {
    const value = entityMetadata[key];
    if (value === undefined) {
      continue;
    }

    const typedPolicy = policy as MetadataPolicy;

    // Apply policy based on its type
    if (typedPolicy.value !== undefined) {
      // Direct value replacement
      result[key] = typedPolicy.value;
    } else if (typedPolicy.add !== undefined) {
      // Add values to existing array
      result[key] = Array.isArray(value)
        ? [...value, ...typedPolicy.add]
        : [...typedPolicy.add];
    } else if (typedPolicy.default !== undefined && value === undefined) {
      // Use default value if current value is undefined
      result[key] = typedPolicy.default;
    } else if (typedPolicy.subset_of !== undefined && Array.isArray(value)) {
      // Check if value is a subset of the allowed values
      const isSubset =
        Array.isArray(value) &&
        value.every((item) => typedPolicy.subset_of?.includes(item));
      if (isSubset) {
        result[key] = value;
      }
    } else if (typedPolicy.one_of !== undefined) {
      // Check if value is one of the allowed values
      if (typedPolicy.one_of.includes(value as never)) {
        result[key] = value;
      }
    } else if (typedPolicy.superset_of !== undefined && Array.isArray(value)) {
      // Check if value is a superset of the required values
      const isSuperset =
        Array.isArray(typedPolicy.superset_of) &&
        typedPolicy.superset_of.every((item) => value.includes(item));
      if (isSuperset) {
        result[key] = value;
      }
    } else {
      // No policy to apply or policy validation failed
      result[key] = value;
    }
  }

  return result;
}
