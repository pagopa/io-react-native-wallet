import { z } from "zod";

import { UnixTime } from "../../../utils/zod";

/**
 * Common type for a parsed Status Assertion
 */
export interface ParsedStatusAssertion {
  credential_hash: string;
  credential_hash_alg: string;
  credential_status_detail?: {
    description: string;
    state: string;
  };
  credential_status_type: string;
  exp: number;
  iat: number;
  iss: string;
}

const StatusListBits = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(4),
  z.literal(8),
]);

export type StatusListContent = z.infer<typeof StatusListContent>;
export const StatusListContent = z.object({
  aggregation_uri: z.url().optional(),
  bits: StatusListBits,
  lst: z.string().min(1),
});

export type StatusList = z.infer<typeof StatusList>;
export const StatusList = z.object({
  exp: UnixTime.optional(),
  iat: UnixTime,
  iss: z.url().optional(),
  status_list: StatusListContent,
  sub: z.url(),
  ttl: z.number().positive().optional(),
});
