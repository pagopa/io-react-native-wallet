import { anonymizeString, obfuscateString } from "../string";

const FISCAL_CODE = "LVLDAA85T50G702B";
const FISCAL_CODE_MASK = "*".repeat(16);

describe("obfuscateString", () => {
  it("should return empty string when input is empty", () => {
    expect(obfuscateString("")).toBe("");
  });

  it("should obfuscate approximately 60% of characters by default", () => {
    const input = "1234567890";
    const result = obfuscateString(input);
    const asteriskCount = (result.match(/\*/g) || []).length;
    expect(asteriskCount).toBe(6); // 60% of 10 chars
  });

  it("should respect custom percentage", () => {
    const input = "1234567890";
    const result = obfuscateString(input, 30);
    const asteriskCount = (result.match(/\*/g) || []).length;
    expect(asteriskCount).toBe(3); // 30% of 10 chars
  });

  it("should use custom obfuscation character", () => {
    const input = "test";
    const result = obfuscateString(input, 50, "#");
    const hashCount = (result.match(/#/g) || []).length;
    expect(hashCount).toBe(2); // 50% of 4 chars
  });

  it("should handle percentage greater than 100", () => {
    const input = "test";
    const result = obfuscateString(input, 150);
    expect(result).toBe("****");
  });

  it("should handle percentage less than 0", () => {
    const input = "test";
    const result = obfuscateString(input, -50);
    expect(result).toBe("test");
  });

  it("should maintain same length as input", () => {
    const input = "test123";
    const result = obfuscateString(input);
    expect(result.length).toBe(input.length);
  });
});

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
