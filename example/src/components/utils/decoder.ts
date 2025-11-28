// Utility functions for decoding and formatting credential attributes.

// Credential attribute type definition.
export type CredentialAttribute = {
  value: any;
  name: { en: string };
};

// Formatted driving privileges type definition.
export type FormattedDrivingPrivileges = {
  Category: string;
  Issued: string;
  Expires: string;
  Restrictions?: string;
};

// Parsed credential type definition.
export type ParsedCredential = Record<string, CredentialAttribute>;

/**
 * Formats driving privileges from the credential attribute.
 * @param privileges - The driving privileges attribute value.
 */
const formatDrivingPrivileges = (
  privileges: any
): FormattedDrivingPrivileges => {
  if (typeof privileges !== "object" || privileges === null) {
    return {
      Category: String(privileges),
      Issued: "N/D",
      Expires: "N/D",
    };
  }

  const output: FormattedDrivingPrivileges = {
    Category: privileges.vehicle_category_code || "N/D",
    Issued: privileges.issue_date || "N/D",
    Expires: privileges.expiry_date || "N/D",
  };

  if (
    privileges.codes &&
    Array.isArray(privileges.codes) &&
    privileges.codes.length > 0
  ) {
    output.Restrictions = privileges.codes
      .map(
        (code: any) =>
          `${code.code} (${code.value}${code.sign ? ` - ${code.sign}` : ""})`
      )
      .join(", ");
  }

  return output;
};

/**
 * Flattens a nested object into a comma-separated string of its values.
 * @param obj - The object to flatten.
 * @returns A comma-separated string of the object's values.
 */
const flattenObject = (obj: any): string => {
  if (typeof obj !== "object" || obj === null) {
    return String(obj);
  }

  const values = Object.values(obj)
    .filter((v) => v !== null && v !== undefined)
    .map(flattenObject);

  return values.join(", ");
};

/**
 * Formats the credential value based on its key and attribute.
 * @param key - The key of the credential attribute.
 * @param attribute - The credential attribute containing the value.
 * @returns The formatted credential value.
 */
export const formatCredentialValue = (
  key: string,
  attribute: CredentialAttribute
): any => {
  const { value } = attribute;

  if (key === "org.iso.18013.5.1:driving_privileges") {
    return formatDrivingPrivileges(value);
  }

  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      return flattenObject(value);
    }

    const isMappedClaim = Object.values(value).some(
      (v) =>
        typeof v === "object" && v !== null && Object.keys(v).includes("value")
    );

    if (isMappedClaim) {
      return value;
    }

    return flattenObject(value);
  }

  return String(value);
};
