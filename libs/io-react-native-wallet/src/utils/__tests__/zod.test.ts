import { stringToJSONSchema } from "../zod";

describe("stringToJSONSchema", () => {
  it("should parse a valid JSON string to a JSON object", () => {
    const jsonString = '{"name":"John","age":30,"isStudent":false}';
    const expected = { age: 30, isStudent: false, name: "John" };
    const result = stringToJSONSchema.parse(jsonString);
    expect(result).toEqual(expected);
  });

  it("should parse a valid JSON string to a JSON array", () => {
    const jsonString = '[1, "two", true, null, {"nested": "object"}]';
    const expected = [1, "two", true, null, { nested: "object" }];
    const result = stringToJSONSchema.parse(jsonString);
    expect(result).toEqual(expected);
  });

  it("should fail for an invalid JSON string", () => {
    const invalidJsonString = '{"name":"John", age:30}'; // age key is not in quotes
    const result = stringToJSONSchema.safeParse(invalidJsonString);
    if (result.success) {
      throw new Error("Expected safeParse to fail");
    }
    expect(result.error.issues[0]?.message).toBe("Invalid JSON");
  });

  it("should fail for a simple string that is not a valid JSON", () => {
    const simpleString = "just a string";
    const result = stringToJSONSchema.safeParse(simpleString);
    if (result.success) {
      throw new Error("Expected safeParse to fail");
    }
    expect(result.error.issues[0]?.message).toBe("Invalid JSON");
  });

  it("should parse a string containing a number", () => {
    const jsonString = "123";
    const result = stringToJSONSchema.parse(jsonString);
    expect(result).toBe(123);
  });

  it("should parse a string containing a boolean", () => {
    const jsonString = "true";
    const result = stringToJSONSchema.parse(jsonString);
    expect(result).toBe(true);
  });

  it("should parse a string containing null", () => {
    const jsonString = "null";
    const result = stringToJSONSchema.parse(jsonString);
    expect(result).toBe(null);
  });

  it("should parse a string containing a string literal", () => {
    const jsonString = '"hello world"';
    const result = stringToJSONSchema.parse(jsonString);
    expect(result).toBe("hello world");
  });
});
