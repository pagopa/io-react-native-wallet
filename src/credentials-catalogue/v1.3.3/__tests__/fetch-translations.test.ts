import type { LocalizationInfo } from "../../api";

import { fetchTranslations } from "../fetch-translations";

const catalogueLocalization: LocalizationInfo = {
  available_locales: ["it", "en"],
  base_uri: "https://registry.example.it/.well-known/credential-catalog",
  default_locale: "it",
  version: "1.0",
};

const asLocalization: LocalizationInfo = {
  available_locales: ["it", "en"],
  base_uri: "https://registry.example.it/.well-known/authentic-sources",
  default_locale: "it",
  version: "1.0",
};

const taxonomyLocalization: LocalizationInfo = {
  available_locales: ["it", "en"],
  base_uri: "https://registry.example.it/.well-known/l10n/taxonomy",
  default_locale: "it",
  version: "1.0",
};

const catalogueItBundle: Record<string, string> = {
  "mDL.issuer.name": "Emittente Esempio",
  "mDL.name": "Patente di Guida",
  "shared.key": "catalogue value",
};

const catalogueEnBundle: Record<string, string> = {
  "mDL.issuer.name": "Example Issuer",
  "mDL.name": "Driving Licence",
  "shared.key": "catalogue value en",
};

const asItBundle: Record<string, string> = {
  "as1.dataset1.origin": "Origine Dati",
  "as1.name": "Ministero Esempio",
  "shared.key": "as value",
};

const asEnBundle: Record<string, string> = {
  "as1.dataset1.origin": "Data Origin",
  "as1.name": "Example Ministry",
  "shared.key": "as value en",
};

const taxonomyItBundle: Record<string, string> = {
  "domain.identity.name": "Identità",
  "purpose.person_identification.name": "Identificazione Persona",
  "taxonomy.name": "Tassonomia IT-Wallet",
};

const taxonomyEnBundle: Record<string, string> = {
  "domain.identity.name": "Identity",
  "purpose.person_identification.name": "Person Identification",
  "taxonomy.name": "IT-Wallet Taxonomy",
};

const makeFetch =
  (bundles: Record<string, Record<string, string>>): GlobalFetch["fetch"] =>
  (input) => {
    const url = input.toString();
    const bundle = bundles[url];
    if (!bundle) {
      return Promise.resolve({
        headers: { get: () => null },
        json: () => Promise.resolve(null),
        status: 404,
        text: () => Promise.resolve(""),
      } as unknown as Response);
    }
    return Promise.resolve({
      headers: { get: () => "application/json" },
      json: () => Promise.resolve(bundle),
      status: 200,
      text: () => Promise.resolve(JSON.stringify(bundle)),
    } as unknown as Response);
  };

describe("fetchTranslations", () => {
  const bundleMap: Record<string, Record<string, string>> = {
    "https://registry.example.it/.well-known/authentic-sources/en.json":
      asEnBundle,
    "https://registry.example.it/.well-known/authentic-sources/it.json":
      asItBundle,
    "https://registry.example.it/.well-known/credential-catalog/en.json":
      catalogueEnBundle,
    "https://registry.example.it/.well-known/credential-catalog/it.json":
      catalogueItBundle,
    "https://registry.example.it/.well-known/l10n/taxonomy/en.json":
      taxonomyEnBundle,
    "https://registry.example.it/.well-known/l10n/taxonomy/it.json":
      taxonomyItBundle,
  };

  it("returns merged translations for each requested locale", async () => {
    const result = await fetchTranslations(
      { authenticSources: asLocalization, catalogue: catalogueLocalization },
      ["it", "en"],
      { appFetch: makeFetch(bundleMap) },
    );

    expect(Object.keys(result)).toEqual(expect.arrayContaining(["it", "en"]));
    expect(result.it).toMatchObject({
      "as1.name": "Ministero Esempio",
      "mDL.name": "Patente di Guida",
    });
    expect(result.en).toMatchObject({
      "as1.name": "Example Ministry",
      "mDL.name": "Driving Licence",
    });
  });

  it("authentic-sources keys override catalogue keys on conflict", async () => {
    const result = await fetchTranslations(
      { authenticSources: asLocalization, catalogue: catalogueLocalization },
      ["it"],
      { appFetch: makeFetch(bundleMap) },
    );

    expect(result.it!["shared.key"]).toBe("as value");
  });

  it("skips locale silently when not in catalogue available_locales", async () => {
    const itOnlyLocalization: LocalizationInfo = {
      ...catalogueLocalization,
      available_locales: ["it"],
    };

    const result = await fetchTranslations(
      { authenticSources: asLocalization, catalogue: itOnlyLocalization },
      ["it", "en"],
      { appFetch: makeFetch(bundleMap) },
    );

    // "en" is not in catalogue available_locales but IS in AS → still present (from AS only)
    expect(result.en).toBeDefined();
    expect(result.en).not.toHaveProperty(["mDL.name"]);
    expect(result.en!["as1.name"]).toBe("Example Ministry");
  });

  it("omits locale entirely when not in any available_locales", async () => {
    const itOnlyLocalization: LocalizationInfo = {
      ...catalogueLocalization,
      available_locales: ["it"],
    };
    const itOnlyAsLocalization: LocalizationInfo = {
      ...asLocalization,
      available_locales: ["it"],
    };
    const itOnlyTaxonomyLocalization: LocalizationInfo = {
      ...taxonomyLocalization,
      available_locales: ["it"],
    };

    const result = await fetchTranslations(
      {
        authenticSources: itOnlyAsLocalization,
        catalogue: itOnlyLocalization,
        taxonomy: itOnlyTaxonomyLocalization,
      },
      ["it", "en"],
      { appFetch: makeFetch(bundleMap) },
    );

    expect(result).toHaveProperty("it");
    expect(result).not.toHaveProperty("en");
  });

  it("works with only catalogue localization provided", async () => {
    const result = await fetchTranslations(
      { catalogue: catalogueLocalization },
      ["it"],
      { appFetch: makeFetch(bundleMap) },
    );

    expect(result.it).toMatchObject({ "mDL.name": "Patente di Guida" });
    expect(result.it).not.toHaveProperty("as1.name");
  });

  it("works with only authenticSources localization provided", async () => {
    const result = await fetchTranslations(
      { authenticSources: asLocalization },
      ["it"],
      { appFetch: makeFetch(bundleMap) },
    );

    expect(result.it).toMatchObject({ "as1.name": "Ministero Esempio" });
    expect(result.it).not.toHaveProperty("mDL.name");
  });

  it("returns empty object when no localizations provided", async () => {
    const result = await fetchTranslations({}, ["it", "en"], {
      appFetch: makeFetch(bundleMap),
    });

    expect(result).toEqual({});
  });

  it("includes taxonomy translations when taxonomy localization is provided", async () => {
    const result = await fetchTranslations(
      {
        authenticSources: asLocalization,
        catalogue: catalogueLocalization,
        taxonomy: taxonomyLocalization,
      },
      ["it"],
      { appFetch: makeFetch(bundleMap) },
    );

    expect(result.it).toMatchObject({
      "as1.name": "Ministero Esempio",
      "domain.identity.name": "Identità",
      "mDL.name": "Patente di Guida",
      "purpose.person_identification.name": "Identificazione Persona",
      "taxonomy.name": "Tassonomia IT-Wallet",
    });
  });

  it("works with only taxonomy localization provided", async () => {
    const result = await fetchTranslations(
      { taxonomy: taxonomyLocalization },
      ["it", "en"],
      { appFetch: makeFetch(bundleMap) },
    );

    expect(result.it).toMatchObject({
      "domain.identity.name": "Identità",
      "taxonomy.name": "Tassonomia IT-Wallet",
    });
    expect(result.en).toMatchObject({
      "domain.identity.name": "Identity",
      "taxonomy.name": "IT-Wallet Taxonomy",
    });
    expect(result.it).not.toHaveProperty("mDL.name");
    expect(result.it).not.toHaveProperty("as1.name");
  });

  it("taxonomy keys take precedence over catalogue and AS keys on conflict", async () => {
    const catalogueWithConflict: LocalizationInfo = {
      ...catalogueLocalization,
      available_locales: ["it"],
    };
    const taxonomyWithConflict: LocalizationInfo = {
      ...taxonomyLocalization,
      available_locales: ["it"],
    };

    // Add a conflicting key via a custom bundle map
    const conflictBundleMap: Record<string, Record<string, string>> = {
      ...bundleMap,
      "https://registry.example.it/.well-known/credential-catalog/it.json": {
        ...catalogueItBundle,
        "conflict.key": "from catalogue",
      },
      "https://registry.example.it/.well-known/l10n/taxonomy/it.json": {
        ...taxonomyItBundle,
        "conflict.key": "from taxonomy",
      },
    };

    const result = await fetchTranslations(
      {
        catalogue: catalogueWithConflict,
        taxonomy: taxonomyWithConflict,
      },
      ["it"],
      { appFetch: makeFetch(conflictBundleMap) },
    );

    expect(result.it!["conflict.key"]).toBe("from taxonomy");
  });
});
