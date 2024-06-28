import { z } from "zod";

const VerificationEvidence = z.object({
  type: z.string(),
  record: z.object({
    type: z.string(),
    source: z.object({
      organization_name: z.string(),
      organization_id: z.string(),
      country_code: z.string(),
    }),
  }),
});
type Verification = z.infer<typeof Verification>;
const Verification = z.object({
  trustFramework: z.literal("eidas"),
  assuranceLevel: z.string(),
  evidence: z.array(VerificationEvidence),
});

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
    birthdate: z.string(),
    placeOfBirth: z
      .object({
        country: z.string(),
        locality: z.string(),
      })
      .optional(),
    taxIdCode: z.string(),
  }),
});
