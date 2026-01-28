import * as z from "zod";

/**
 * Create a mapper to convert data from type I to type O.
 *
 * By default only static type checking is applied when mapping types.
 * To include runtime validation, provide zod schemas for both I and O.
 *
 * @param mapper The mapping function
 * @param config.inputSchema The schema to validate the input before mapping (required when config is provided)
 * @param config.outputSchema The schema to validate the mapped input (required when config is provided)
 * @returns A function to convert I to O
 *
 * @example
 * // Type checking only
 * createMapper<TypeA, TypeB>(mapper)
 *
 * // Type checking with runtime validation
 * createMapper(mapper, {
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
