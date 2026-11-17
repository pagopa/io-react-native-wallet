import { anonymizeString } from "../string";

const FISCAL_CODE = "LVLDAA85T50G702B";
const FISCAL_CODE_MASK = "*".repeat(16);

describe("anonymizeString", () => {
  it("replaces a fiscal code in a string", () => {
    expect(anonymizeString(`User ${FISCAL_CODE} not found`)).toBe(
      `User ${FISCAL_CODE_MASK} not found`,
    );
  });

  it("replaces every fiscal code in a string", () => {
    expect(anonymizeString(`${FISCAL_CODE} and rssmra85t10a562s`)).toBe(
      `${FISCAL_CODE_MASK} and ${FISCAL_CODE_MASK}`,
    );
  });

  it("leaves strings without a fiscal code unchanged", () => {
    expect(anonymizeString("credential_not_found")).toBe(
      "credential_not_found",
    );
  });

  it("replaces fiscal codes in nested object string values", () => {
    expect(
      anonymizeString({
        error: "invalid_request",
        error_description: `Mismatch for ${FISCAL_CODE}`,
        nested: { tax_id: FISCAL_CODE },
      }),
    ).toEqual({
      error: "invalid_request",
      error_description: `Mismatch for ${FISCAL_CODE_MASK}`,
      nested: { tax_id: FISCAL_CODE_MASK },
    });
  });

  it("replaces fiscal codes in arrays", () => {
    expect(anonymizeString([FISCAL_CODE, "ok"])).toEqual([
      FISCAL_CODE_MASK,
      "ok",
    ]);
  });

  it("leaves non-string primitives unchanged", () => {
    expect(anonymizeString(404)).toBe(404);
    expect(anonymizeString(null)).toBe(null);
  });
});
