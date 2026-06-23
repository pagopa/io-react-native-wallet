import { z } from "zod";
import { UnixTime } from "../../../utils/zod";

/**
 * Common type for a parsed Status Assertion
 */
export type ParsedStatusAssertion = {
  iss: string;
  iat: number;
  exp: number;
  credential_hash: string;
  credential_hash_alg: string;
  credential_status_type: string;
  credential_status_detail?: {
    state: string;
    description: string;
  };
};

const StatusListBits = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(4),
  z.literal(8),
]);

export type StatusListContent = z.infer<typeof StatusListContent>;
export const StatusListContent = z.object({
  bits: StatusListBits,
  lst: z.string().min(1),
  aggregation_uri: z.url().optional(),
});

export type StatusList = z.infer<typeof StatusList>;
export const StatusList = z.object({
  sub: z.url(),
  iat: UnixTime,
  iss: z.url().optional(),
  exp: UnixTime.optional(),
  ttl: z.number().positive().optional(),
  status_list: StatusListContent,
});
