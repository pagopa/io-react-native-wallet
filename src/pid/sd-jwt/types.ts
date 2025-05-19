import { z } from "zod";
import { SdJwt4VC, Verification } from "../../sd-jwt/types";

/**
 * Data structure for the PID.
 * It contains PID claims in plain text as well as verification data with the issuer's information
 *
 * @see https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
 */
export type PID = z.infer<typeof PID>;
export const PID = z.object({
  issuer: z.string(),
  issuedAt: z.date(),
  expiration: z.date(),
  verification: Verification.optional(),
  claims: z.object({
    uniqueId: z.string(),
    givenName: z.string(),
    familyName: z.string(),
    birthDate: z.string(),
    placeOfBirth: z
      .object({
        country: z.string(),
        locality: z.string(),
      })
      .optional(),
    taxIdCode: z.string(),
  }),
});

/**
 * SdJwt4VC PID extension
 */
export type PidSdJwt4VC = z.infer<typeof PidSdJwt4VC>;
export const PidSdJwt4VC = SdJwt4VC.extend({
  payload: SdJwt4VC.shape.payload.and(
    z.object({
      expiry_date: z.string().refine((str) => !isNaN(new Date(str).getTime())),
      issuing_country: z.string(),
      issuing_authority: z.string(),
    })
  ),
});
