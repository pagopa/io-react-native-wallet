import z from "zod";

/**
 * Create a mapper to convert data from type I to type O.
 *
 * By default only static type checking is applied when mapping types.
 * To include runtime validation, provide zod schemas for I and O.
 *
 * @param mapper The mapping function
 * @param config.inputSchema The schema to validate the input before mapping (optional)
 * @param config.outputSchema The schema to validate the mapped input (optional)
 * @returns A function to convert I to O
 *
 * @example
 * // Type checking only
 * createAdapter<TypeA, TypeB>(mapper)
 *
 * // Type checking with runtime validation
 * createAdapter(mapper, {
 *   inputSchema: TypeA,
 *   outputSchema: TypeB
 * })
 */
export const createMapper = <I, O>(
  mapper: (input: I) => O,
  config?: {
    inputSchema: z.ZodType<I>;
    outputSchema: z.ZodType<O>;
  }
) => {
  if (!config) {
    return mapper as (input: unknown) => O;
  }

  const { inputSchema, outputSchema } = config;

  return (input: unknown) =>
    inputSchema.transform(mapper).pipe(outputSchema).parse(input);
};
