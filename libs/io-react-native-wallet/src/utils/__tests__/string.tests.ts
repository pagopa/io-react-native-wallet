import { obfuscateString } from "../string";

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
