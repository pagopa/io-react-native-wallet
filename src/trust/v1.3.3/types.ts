import * as z from "zod";
import { JWK } from "../../utils/jwk";
import { BaseEntityConfiguration } from "../common/types";
import {
  itWalletCredentialIssuerMetadataV1_3,
  itWalletAuthorizationServerMetadataV1_3,
  itWalletSolutionEntityMetadataV1_3,
  itWalletCredentialVerifierMetadataV1_3
} from "@pagopa/io-wallet-oid-federation";

// Entity configuration for a Credential Issuer
export type CredentialIssuerEntityConfiguration = z.infer<
  typeof CredentialIssuerEntityConfiguration
>;
export const CredentialIssuerEntityConfiguration = BaseEntityConfiguration.and(
  z.object({
    payload: z.object({
      jwks: z.object({ keys: z.array(JWK) }),
      metadata: z.object({
        openid_credential_issuer: itWalletCredentialIssuerMetadataV1_3,
        oauth_authorization_server: itWalletAuthorizationServerMetadataV1_3,
        openid_credential_verifier: itWalletCredentialVerifierMetadataV1_3.optional(),

      }),
      
    }),
  })
);

// Entity configuration for a Relying Party
export type RelyingPartyEntityConfiguration = z.infer<
  typeof RelyingPartyEntityConfiguration
>;
export const RelyingPartyEntityConfiguration = BaseEntityConfiguration.and(
  z.object({
    payload: z.object({
      metadata: z.object({
        openid_credential_verifier: itWalletCredentialVerifierMetadataV1_3,
      }),
    }),
  })
);

// Entity configuration for a Wallet Provider
export type WalletProviderEntityConfiguration = z.infer<
  typeof WalletProviderEntityConfiguration
>;
export const WalletProviderEntityConfiguration = BaseEntityConfiguration.and(
  z.object({
    payload: z.object({
      metadata: z.object({
        wallet_solution: itWalletSolutionEntityMetadataV1_3
      }),
    }),
  })
);

// Maps any entity configuration by the union of every possible shapes
export type EntityConfiguration = z.infer<typeof EntityConfiguration>;
export const EntityConfiguration = z.union(
  [
    WalletProviderEntityConfiguration,
    CredentialIssuerEntityConfiguration,
    RelyingPartyEntityConfiguration,
  ],
  {
    description: "Any kind of Entity Configuration allowed in the ecosystem",
  }
);
