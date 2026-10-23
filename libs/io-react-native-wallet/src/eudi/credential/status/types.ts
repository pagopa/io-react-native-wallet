import { z } from "zod";

/** Header of a Status List Token, signed with the key of its `x5c` leaf certificate */
export const StatusListHeader = z.looseObject({
  x5c: z.tuple([z.string()], z.string()),
});

export type CredentialStatus = {
  /** Raw status value in hexadecimal format, such as `0x01` */
  rawStatus: string;
  status: "INVALID" | "SUSPENDED" | "UNKNOWN" | "VALID";
};
