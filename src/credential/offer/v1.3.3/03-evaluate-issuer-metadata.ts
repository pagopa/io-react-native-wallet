import { getCredentialIssuerMetadata } from "../common/utils";
import type { OfferApi } from "../api";
import { CredentialIssuerMetadataSchema } from "./types";
import { mapToIssuerMetadata } from "./mappers";

export const evaluateIssuerMetadataFromOffer: OfferApi["evaluateIssuerMetadataFromOffer"] =
  async (credentialOffer, context = {}) => {
    const { appFetch = fetch } = context;

    // The issuer URL provided in the Credential Offer
    // This is using openid-credential-issuer instead of openid-federation
    // TODO: evaluate if we need to support both endpoints
    const issuerUrl = credentialOffer.credential_issuer;
    const response = await getCredentialIssuerMetadata(
      issuerUrl,
      CredentialIssuerMetadataSchema,
      {
        appFetch,
      }
    );
    return { issuerConf: mapToIssuerMetadata(response) };
  };
