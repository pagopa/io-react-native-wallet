import z from 'zod';
import { GenericModuleErrorSchema } from '../../schema';

/**
 * Error codes which the CBOR module uses to reject a promise.
 */
const ModuleErrorCodesSchema = z.enum([
  'DECODE_ERROR',
  'DECODE_DOCUMENTS_ERROR',
  'DECODE_ISSUER_SIGNED_ERROR',
  'EUNSPECIFIED', // Android only default when no other error is specified
]);

export type ModuleErrorCodes = z.infer<typeof ModuleErrorCodesSchema>;

/**
 * Schema which can be used to parse a rejected promise error by the CBOR module.
 */
export const ModuleErrorSchema = GenericModuleErrorSchema(
  ModuleErrorCodesSchema
);

export type ModuleError = z.infer<typeof ModuleErrorSchema>;
