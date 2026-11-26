import { z } from 'zod';

/**
 * Schema for parsing a nativeStackAndroid object of a rejected promise error in an Android native module.
 */
const StackTraceElementSchema = z.object({
  lineNumber: z.number(),
  file: z.string().nullable(),
  methodName: z.string(),
  class: z.string(),
});

/**
 * Schema for parsing specific parameters of a rejected promise error in an Android native module.
 */
const ModuleErrorAndroidSchema = z.object({
  nativeStackAndroid: z.array(StackTraceElementSchema).optional(),
});

/**
 * Schema for parsing specific parameters of a rejected promise error in an iOS native module.
 */
const ModuleErrorIosSchema = z.object({
  domain: z.string().optional(),
  nativeStackIOS: z.array(z.string()).optional(),
});

/**
 * Schema for parsing common parameters of a rejected promise error in a native module.
 * This schema contains the common parameters that are shared across both Android and iOS native modules.
 * Parameters which are platform specific are defined as optional and must be checked at runtime.
 * @param codeSchema - The Zod schema for the error codes used by the module.
 * @returns A schema for the common parameters of a rejected promise error in a native module.
 */
export const GenericModuleErrorSchema = <CodeType extends z.ZodType<string>>(
  codeSchema: CodeType
) =>
  z
    .object({
      code: codeSchema,
      message: z.string(),
      name: z.string(),
      userInfo: z.record(z.string(), z.any()).nullish(),
    })
    .extend({
      ...ModuleErrorAndroidSchema.shape,
      ...ModuleErrorIosSchema.shape,
    });
