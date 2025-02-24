/**
 * Extracts the date value of a given elementIdentifier from an MDOC object.
 * Searches through the issuerSigned namespaces and attempts to parse the value as a Date.
 * The expected date format is "DD-MM-YYYY".
 * Returns the Date object if found, otherwise returns null.
 */
export function extractElementValueAsDate(elementValue: string): Date | null {
  if (typeof elementValue === "string") {
    const dateParts = elementValue.split("-");
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts.map((part) => Number(part));
      if (
        day !== undefined &&
        month !== undefined &&
        year !== undefined &&
        !isNaN(day) &&
        !isNaN(month) &&
        !isNaN(year)
      ) {
        return new Date(year, month - 1, day); // Month is zero-based in JS Date
      }
    }
  }

  return null; // Return null if no matching element is found or it's not a valid date
}
