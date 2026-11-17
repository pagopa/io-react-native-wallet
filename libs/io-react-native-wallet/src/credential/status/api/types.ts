import { z } from "zod";

import { UnixTime } from "../../../utils/zod";

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
