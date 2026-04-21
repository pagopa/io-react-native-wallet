import type { CredentialsCatalogueApi as Api } from "../api";
import { fetchLocaleBundle } from "./utils";

export const fetchTranslations: NonNullable<Api["fetchTranslations"]> = async (
  { catalogue, authenticSources },
  locales,
  { appFetch = fetch } = {}
) => {
  const result: Record<string, Record<string, string>> = {};

  await Promise.all(
    locales.map(async (locale) => {
      const [catalogueBundle, asBundle] = await Promise.all([
        catalogue?.available_locales.includes(locale)
          ? fetchLocaleBundle(catalogue.base_uri, locale, appFetch)
          : Promise.resolve({}),
        authenticSources?.available_locales.includes(locale)
          ? fetchLocaleBundle(authenticSources.base_uri, locale, appFetch)
          : Promise.resolve({}),
      ]);

      const merged = { ...catalogueBundle, ...asBundle };

      // Only include the locale in the result if at least one source provided translations
      if (Object.keys(merged).length > 0) {
        result[locale] = merged;
      }
    })
  );

  return result;
};
