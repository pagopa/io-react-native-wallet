import type { CredentialIssuerMetadata, CredentialOffer } from "./types";
import { getCredentialIssuerMetadata } from "./utils";

export type EvaluateIssuerMetadataFromOffer = (
  credentialOffer: CredentialOffer,
  context?: {
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{
  issuerConf: CredentialIssuerMetadata;
}>;

/**
 * Evaluates the issuer metadata from a given credential offer.
 * @param credentialOffer - The credential offer containing the issuer information.
 * @param context - Optional context object that may provide a custom `appFetch` implementation.
 */
export const evaluateIssuerMetadataFromOffer: EvaluateIssuerMetadataFromOffer =
  async (credentialOffer, context = {}) => {
    const { appFetch = fetch } = context;

    // The issuer URL provided in the Credential Offer
    const issuerUrl = credentialOffer.credential_issuer;
    let issuerConf: CredentialIssuerMetadata;
    try {
      issuerConf = await getCredentialIssuerMetadata(issuerUrl, {
        appFetch,
      });
      console.log(issuerConf);
    } catch (error) {
      console.log(error);
      throw new Error(
        `Failed to fetch or validate issuer metadata from ${issuerUrl}: ${error}`
      );
    }

    return { issuerConf };
  };
