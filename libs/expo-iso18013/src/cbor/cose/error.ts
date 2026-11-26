import z from 'zod';
import { GenericModuleErrorSchema } from '../../schema';

/**
 * Error codes which the COSE module uses to reject a promise.
 */
const ModuleErrorCodesSchema = z.enum([
  'SIGN_ERROR',
  'VERIFY_ERROR',
  'THREADING_ERROR', // iOS only
  'EUNSPECIFIED', // Android only default when no other error is specified
]);

export type ModuleErrorCodes = z.infer<typeof ModuleErrorCodesSchema>;

/**
 * Schema which can be used to parse a rejected promise error by the COSE module.
 */
export const ModuleErrorSchema = GenericModuleErrorSchema(
  ModuleErrorCodesSchema
);

export type ModuleError = z.infer<typeof ModuleErrorSchema>;
