import { type DigitalCredentialsCatalogue } from "./DigitalCredentialsCatalogue";

type FetchContext = { appFetch?: GlobalFetch["fetch"] };

export interface CredentialsCatalogueApi {
  /**
   * Fetch and parse the Digital Credential Catalogue from the Trust Anchor.
   * The catalogue's JWT signature is verified against the Trust Anchor's JWKs.
   *
   * @since 1.0.0
   * @param trustAnchorBaseUrl Base URL of the Trust Anchor
   * @param context.appFetch (optional) fetch API implementation. Default: built-in fetch
   * @returns The Digital Credential Catalogue payload
   */
  fetchAndParseCatalogue(
    trustAnchorBaseUrl: string,
    ctx?: FetchContext
  ): Promise<DigitalCredentialsCatalogue>;
}

export { type DigitalCredentialsCatalogue };
