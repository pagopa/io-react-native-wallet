/**
 * @see https://github.com/JacobWeisenburger/zod_utilz/blob/main/src/stringToJSON.ts
 */

import { z } from "zod";

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

type Json = Json[] | Literal | { [key: string]: Json };

type Literal = z.infer<typeof literalSchema>;

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    literalSchema,
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

export const json = () => jsonSchema;

export const stringToJSONSchema = z
  .string()
  .transform((str, ctx): z.infer<ReturnType<typeof json>> => {
    try {
      return JSON.parse(str);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid JSON" });
      return z.NEVER;
    }
  });

export const UnixTime = z.number().min(0).max(2147483647000);
export type UnixTime = z.infer<typeof UnixTime>;
