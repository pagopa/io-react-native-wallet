import * as z from "zod";
import { createMapper } from "../mappers";

describe("createMapper", () => {
  type Input = { value: string };
  type Output = { mapped_value: string };

  const Input = z.object({ value: z.string() });
  const Output = z.object({ mapped_value: z.string() });

  it("maps I to O without runtime validation", () => {
    const mapper = createMapper<Input, Output>((x) => ({
      mapped_value: x.value,
    }));
    expect(mapper({ value: "A" })).toEqual({ mapped_value: "A" });
  });

  it("maps I to O with runtime validation (success)", () => {
    const mapper = createMapper((x) => ({ mapped_value: x.value }), {
      inputSchema: Input,
      outputSchema: Output,
    });
    expect(mapper({ value: "A" })).toEqual({ mapped_value: "A" });
  });

  it("maps I to O with runtime validation (fail)", () => {
    const mapper = createMapper((x) => ({ mapped_value: x.value }), {
      inputSchema: Input,
      outputSchema: Output,
    });
    expect(() => mapper({ wrong_value: "A" })).toThrow();
  });
});
