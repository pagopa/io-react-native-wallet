import { z, type ZodError } from "zod";
import type { RequestObject } from "../api";
import type { DirectAuthorizationBodyPayload } from "../v1.0.0/types";

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

/**
 * Builds a URL-encoded form body for a direct POST response without encryption.
 *
 * @param requestObject - Contains state, nonce, and other relevant info.
 * @param payload - Object that contains either the VP token to encrypt and the stringified mapping of the credential disclosures or the error code
 * @returns A URL-encoded string suitable for an `application/x-www-form-urlencoded` POST body.
 */
export const buildDirectPostBody = async (
  requestObject: RequestObject,
  payload: DirectAuthorizationBodyPayload
): Promise<string> => {
  const formUrlEncodedBody = new URLSearchParams({
    state: requestObject.state,
    ...Object.entries(payload).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]:
          Array.isArray(value) || typeof value === "object"
            ? JSON.stringify(value)
            : value,
      }),
      {} as Record<string, string>
    ),
  });

  return formUrlEncodedBody.toString();
};
