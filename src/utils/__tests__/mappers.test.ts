import * as z from "zod";
import { createMapper, withMapper, withMapperAsync } from "../mappers";

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

  it("maps I to O with output-only runtime validation (success)", () => {
    const mapper = createMapper<Input, Output>(
      (x) => ({ mapped_value: x.value }),
      { outputSchema: Output }
    );
    expect(mapper({ value: "A" })).toEqual({ mapped_value: "A" });
  });

  it("maps I to O with output-only runtime validation (fail)", () => {
    const mapper = createMapper<Input, Output>(
      // @ts-expect-error force wrong output type to trigger runtime validation
      (x) => ({ wrong_value: x.value }),
      { outputSchema: Output }
    );
    expect(() => mapper({ value: "A" })).toThrow();
  });
});

describe("withMapper", () => {
  it("works correctly", () => {
    const fn = (input: number) => input * 2;
    const mapper = (input: number) => input.toFixed(2);
    expect(withMapper(mapper, fn)(4)).toEqual("8.00");
  });
});

describe("withMapperAsync", () => {
  it("works correctly", async () => {
    const fn = async (input: number) => input * 2;
    const mapper = (input: number) => input.toFixed(2);
    expect(await withMapperAsync(mapper, fn)(4)).toEqual("8.00");
  });
});
