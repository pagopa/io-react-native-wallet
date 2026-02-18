import { z, type ZodError } from "zod";

/**
 * Validates an unknown payload against a given Zod schema.
 *
 * If validation succeeds, the typed result is returned.
 * If validation fails, the provided error factory is invoked in order to
 * throw a domain-specific error (e.g. InvalidRequestObjectError).
 *
 * @typeParam T - The inferred type of the schema.
 * @typeParam E - The error type to throw on validation failure.
 *
 * @param schema - The Zod schema used for validation.
 * @param payload - The unknown input to validate.
 * @param makeError - Factory function to create a domain error.
 * @param message - Optional high-level error message.
 *
 * @throws The mapped domain-specific error if validation fails.
 */
export const validateWithSchema = <T, E extends Error>(
  schema: z.ZodType<T>,
  payload: unknown,
  makeError: (message: string, reason: string) => E,
  message = "Invalid payload"
): T => {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return parsed.data;

  const reason = formatFlattenedZodErrors(parsed.error.flatten());

  throw makeError(message, reason);
};

/**
 * Utility to format flattened Zod errors into a simplified string `key1: key1_error, key2: key2_error`
 */
const formatFlattenedZodErrors = (
  errors: ReturnType<ZodError["flatten"]>
): string =>
  Object.entries(errors.fieldErrors)
    .map(([key, msgs]) => `${key}: ${msgs?.[0] ?? "invalid"}`)
    .join(", ");
