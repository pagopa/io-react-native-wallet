import z from 'zod';
import { GenericModuleErrorSchema } from '../../schema';

/**
 * Error codes which the ISO18013_7 module uses to reject a promise.
 */
const ModuleErrorCodesSchema = z.enum([
  'GENERATE_OID4VP_RESPONSE_ERROR',
  'EUNSPECIFIED', // Android only default when no other error is specified
]);

export type ModuleErrorCodes = z.infer<typeof ModuleErrorCodesSchema>;

/**
 * Schema which can be used to parse a rejected promise error by the ISO18013_7 module.
 */
export const ModuleErrorSchema = GenericModuleErrorSchema(
  ModuleErrorCodesSchema
);

export type ModuleError = z.infer<typeof ModuleErrorSchema>;
