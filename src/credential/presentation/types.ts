import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { UnixTime } from "../../sd-jwt/types";
import * as z from "zod";

/**
 * A pair that associate a tokenized Verified Credential with the claims presented or requested to present.
 */
export type Presentation = [
  /* verified credential token */ string,
  /* claims */ string[],
  /* the context for the key associated to the credential */ CryptoContext
];

// Credential Format with a JSON-based claims structure
const DcqlJsonClaim = z.object({
  id: z.string(),
  path: z.array(z.string()),
  values: z.array(z.any()).optional(),
});

// Credential Format based on mdoc format defined in ISO 18013-5
const DcqlMdocClaim = z.object({
  id: z.string(),
  namespace: z.string(),
  claim_name: z.string(),
  values: z.array(z.any()).optional(),
});

const DcqlCredential = z.object({
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

const DcqlCredentialSet = z.object({
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

export type RequestObject = z.infer<typeof RequestObject>;
export const RequestObject = z.object({
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
  state: z.string(),
  nonce: z.string(),
  response_uri: z.string(),
  response_uri_method: z.string().optional(),
  response_type: z.literal("vp_token"),
  response_mode: z.enum(["direct_post.jwt", "direct_post"]),
  client_id: z.string(),
  client_id_scheme: z.string(), // previous z.literal("entity_id"),
  scope: z.string().optional(),
  dcql_query: DcqlQuery,
});

export type WalletMetadata = z.infer<typeof WalletMetadata>;
export const WalletMetadata = z.object({
  presentation_definition_uri_supported: z.boolean().optional(),
  client_id_schemes_supported: z.array(z.string()).optional(),
  request_object_signing_alg_values_supported: z.array(z.string()).optional(),
  vp_formats_supported: z.record(
    z.string(), // TODO: use explicit credential format?
    z.object({
      "sd-jwt_alg_values": z.array(z.string()).optional(), // alg_values_supported?
    })
  ),
  // TODO: include other metadata?
});

/**
 * Wallet capabilities that must be submitted to get the Request Object
 * via POST request when the `request_uri_method` is `post`.
 */
export type RequestObjectWalletCapabilities = z.infer<
  typeof RequestObjectWalletCapabilities
>;
export const RequestObjectWalletCapabilities = z.object({
  wallet_metadata: WalletMetadata,
  wallet_nonce: z.string().optional(),
});
