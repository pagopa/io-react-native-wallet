import z from 'zod';
import { GenericModuleErrorSchema } from '../../schema';

/**
 * Schema for parsing the payload returned by the `onError` event in Proximity `Events`, along with its type definition.
 */
export const OnErrorPayloadSchema = z.string().catch('Unknown error');

export type OnErrorPayload = z.infer<typeof OnErrorPayloadSchema>;

/**
 * Error codes which the ISO18013_5 module uses to reject a promise.
 */
const ModuleErrorCodesSchema = z.enum([
  'DRH_NOT_DEFINED', // Android only
  'START_ERROR',
  'SEND_RESPONSE_ERROR',
  'SEND_ERROR_RESPONSE_ERROR',
  'GENERATE_RESPONSE_ERROR',
  'CLOSE_ERROR', // Android only
  'EUNSPECIFIED', // Android only default when no other error is specified
]);

export type ModuleErrorCodes = z.infer<typeof ModuleErrorCodesSchema>;

/**
 * Schema which can be used to parse a rejected promise error by the ISO18013_5 module.
 */
export const ModuleErrorSchema = GenericModuleErrorSchema(
  ModuleErrorCodesSchema
);

export type ModuleError = z.infer<typeof ModuleErrorSchema>;
