import {
  type CatalogueTranslations,
  type DigitalCredentialsCatalogue,
  type LocalizationInfo,
} from "./DigitalCredentialsCatalogue";

type FetchContext = { appFetch?: GlobalFetch["fetch"] };

type FetchTranslationsLocalizations = {
  catalogue?: LocalizationInfo;
  authenticSources?: LocalizationInfo;
};

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

  /**
   * Fetch locale bundle files for the credential catalogue and authentic sources.
   * For each requested locale, fetches translations from both registries (if the locale
   * is listed in their respective `available_locales`) and merges the keys.
   * Locales not present in a registry's `available_locales` are silently skipped for that source.
   * On key conflicts, authentic-sources translations take precedence.
   *
   * @since 1.3.3
   * @param localizations Localization metadata from a previously fetched catalogue
   * @param locales Array of locale codes to fetch (e.g. ["it", "en"])
   * @param ctx.appFetch (optional) fetch API implementation. Default: built-in fetch
   * @returns Record keyed by locale, each containing merged translation key→value pairs
   */
  fetchTranslations(
    localizations: FetchTranslationsLocalizations,
    locales: string[],
    ctx?: FetchContext
  ): Promise<CatalogueTranslations>;
}

export {
  type CatalogueTranslations,
  type DigitalCredentialsCatalogue,
  type LocalizationInfo,
};
