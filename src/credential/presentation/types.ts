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

export type RequestObject = z.infer<typeof RequestObject>;
export const RequestObject = z.object({
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
  state: z.string(),
  nonce: z.string(),
  response_uri: z.string(),
  response_type: z.literal("vp_token"),
  response_mode: z.literal("direct_post.jwt"),
  client_id: z.string(),
  client_id_scheme: z.literal("entity_id"),
  scope: z.string(),
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
