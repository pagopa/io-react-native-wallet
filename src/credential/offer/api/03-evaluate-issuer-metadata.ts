import type { CredentialIssuerMetadata, CredentialOffer } from "./types";

export interface EvaluateIssuerMetadataApi {
  evaluateIssuerMetadataFromOffer(
    /**
     * Evaluates the issuer metadata from a given credential offer.
     * @param credentialOffer - The credential offer containing the issuer information.
     * @param context - Optional context object that may provide a custom `appFetch` implementation.
     */
    credentialOffer: CredentialOffer,
    context?: {
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<{
    issuerConf: CredentialIssuerMetadata;
  }>;
}
