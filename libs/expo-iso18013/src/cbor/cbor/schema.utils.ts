import { z } from 'zod';

/**
 * If the value is a string, parse it as JSON.
 * Otherwise, return the value as is.
 * Useful for unescaping stringified JSON content
 */
export const coerceToJSON = z.any().transform((any) => {
  if (typeof any === 'object') {
    return any;
  }
  return JSON.parse(any);
});
