import type { CredentialIssuerMetadata } from "../api/types";
import { getCredentialIssuerMetadata } from "../common/utils";
import type { OfferApi } from "../api";
import { IoWalletError } from "../../../utils/errors";

export const evaluateIssuerMetadataFromOffer: OfferApi["evaluateIssuerMetadataFromOffer"] =
  async (credentialOffer, context = {}) => {
    const { appFetch = fetch } = context;

    // The issuer URL provided in the Credential Offer
    // This is using openid-credential-issuer instead of openid-federation
    // TODO: evaluate if we need to support both endpoints
    const issuerUrl = credentialOffer.credential_issuer;
    let issuerConf: CredentialIssuerMetadata;
    try {
      issuerConf = await getCredentialIssuerMetadata(issuerUrl, {
        appFetch,
      });
    } catch (error) {
      throw new IoWalletError(
        `Failed to fetch or validate issuer metadata from ${issuerUrl}: ${error}`
      );
    }

    return { issuerConf };
  };
