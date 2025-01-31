import * as z from "zod";

// Credential Format with a JSON-based claims structure
export const DcqlJsonClaim = z.object({
  id: z.string(),
  path: z.array(z.string()),
  values: z.array(z.any()).optional(),
});

// Credential Format based on mdoc format defined in ISO 18013-5
export const DcqlMdocClaim = z.object({
  id: z.string(),
  namespace: z.string(),
  claim_name: z.string(),
  values: z.array(z.any()).optional(),
});

export const DcqlCredential = z.object({
  id: z.string().min(1), // Mandatory unique string ID
  format: z.string(), // TODO: use explicit Credential Format Identifiers?
  claims: z.array(DcqlJsonClaim).optional(), // TODO: ignore mdoc for now...
  claim_sets: z.array(z.array(z.string())).optional(), // Which combination of claims are requested by the verifier
  meta: z
    .object({
      vct_values: z.array(z.string()).optional(),
      doctype_value: z.string().optional(),
    })
    .optional(),
});

export const DcqlCredentialSet = z.object({
  options: z.array(z.array(z.string())),
  required: z.boolean(),
  purpose: z
    .union([z.string(), z.number(), z.record(z.string(), z.any())])
    .optional(), // Describe the purpose of the query
});

/**
 * Structure of a DCQL query (Digital Credential Query Language).
 */
export type DcqlQuery = z.infer<typeof DcqlQuery>;
export const DcqlQuery = z.object({
  credentials: z.array(DcqlCredential),
  credential_sets: z.array(DcqlCredentialSet).optional(),
});
