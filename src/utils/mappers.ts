import * as z from "zod";

/**
 * Create a mapper to convert data from type I to type O.
 *
 * By default only static type checking is applied when mapping types.
 * To include runtime validation, provide zod schemas for I (optional) and O.
 *
 * @param mapper The mapping function
 * @param config.inputSchema The schema to validate the input before mapping (optional)
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
export function createMapper<I, O>(mapper: (input: I) => O): (input: I) => O;
export function createMapper<I, O>(
  mapper: (input: I) => O,
  config: { inputSchema: z.ZodType<I>; outputSchema: z.ZodType<O> }
): (input: unknown) => O;
export function createMapper<I, O>(
  mapper: (input: I) => O,
  config: { outputSchema: z.ZodType<O> }
): (input: I) => O;
export function createMapper<I, O>(
  mapper: (input: I) => O,
  config?: {
    inputSchema?: z.ZodType<I>;
    outputSchema: z.ZodType<O>;
  }
) {
  if (!config) {
    return mapper;
  }

  const { inputSchema, outputSchema } = config;

  if (inputSchema) {
    return (input: unknown) =>
      inputSchema.transform(mapper).pipe(outputSchema).parse(input);
  }

  return (input: I) => outputSchema.parse(mapper(input));
}

/**
 * Higher order function to pipe a function return value to the provided mapper.
 * Supports only synchronous functions. Use {@link withMapperAsync} for async ones.
 * @param mapper The mapping function
 * @fn The function to wrap
 * @return The original function with the mapper applied to its return value
 */
export const withMapper = <A extends any[], I, O>(
  mapper: (input: I) => O,
  fn: (...args: A) => I
) => {
  return function wrappedFunction(...args: A) {
    return mapper(fn(...args));
  };
};

/**
 * Higher order function to pipe an async function return value to the provided mapper.
 * Supports only asynchronous functions. Use {@link withMapper} for sync ones.
 * @param mapper The mapping function
 * @fn The function to wrap
 * @return The original function with the mapper applied to its return value
 */
export const withMapperAsync = <A extends any[], I, O>(
  mapper: (input: I) => O,
  fn: (...args: A) => Promise<I>
) => {
  return async function wrappedAsyncFunction(...args: A) {
    return mapper(await fn(...args));
  };
};
