import { fetchTranslations } from "../fetch-translations";
import type { LocalizationInfo } from "../../api";

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

const catalogueItBundle: Record<string, string> = {
  "mDL.name": "Patente di Guida",
  "mDL.issuer.name": "Emittente Esempio",
  "shared.key": "catalogue value",
};

const catalogueEnBundle: Record<string, string> = {
  "mDL.name": "Driving Licence",
  "mDL.issuer.name": "Example Issuer",
  "shared.key": "catalogue value en",
};

const asItBundle: Record<string, string> = {
  "as1.name": "Ministero Esempio",
  "as1.dataset1.origin": "Origine Dati",
  "shared.key": "as value",
};

const asEnBundle: Record<string, string> = {
  "as1.name": "Example Ministry",
  "as1.dataset1.origin": "Data Origin",
  "shared.key": "as value en",
};

const makeFetch =
  (bundles: Record<string, Record<string, string>>): GlobalFetch["fetch"] =>
  (input) => {
    const url = input.toString();
    const bundle = bundles[url];
    if (!bundle) {
      return Promise.resolve({
        status: 404,
        headers: { get: () => null },
        json: () => Promise.resolve(null),
        text: () => Promise.resolve(""),
      } as unknown as Response);
    }
    return Promise.resolve({
      status: 200,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve(bundle),
      text: () => Promise.resolve(JSON.stringify(bundle)),
    } as unknown as Response);
  };

describe("fetchTranslations", () => {
  const bundleMap: Record<string, Record<string, string>> = {
    "https://registry.example.it/.well-known/credential-catalog/it.json":
      catalogueItBundle,
    "https://registry.example.it/.well-known/credential-catalog/en.json":
      catalogueEnBundle,
    "https://registry.example.it/.well-known/authentic-sources/it.json":
      asItBundle,
    "https://registry.example.it/.well-known/authentic-sources/en.json":
      asEnBundle,
  };

  it("returns merged translations for each requested locale", async () => {
    const result = await fetchTranslations(
      { catalogue: catalogueLocalization, authenticSources: asLocalization },
      ["it", "en"],
      { appFetch: makeFetch(bundleMap) }
    );

    expect(Object.keys(result)).toEqual(expect.arrayContaining(["it", "en"]));
    expect(result.it).toMatchObject({
      "mDL.name": "Patente di Guida",
      "as1.name": "Ministero Esempio",
    });
    expect(result.en).toMatchObject({
      "mDL.name": "Driving Licence",
      "as1.name": "Example Ministry",
    });
  });

  it("authentic-sources keys override catalogue keys on conflict", async () => {
    const result = await fetchTranslations(
      { catalogue: catalogueLocalization, authenticSources: asLocalization },
      ["it"],
      { appFetch: makeFetch(bundleMap) }
    );

    expect(result.it!["shared.key"]).toBe("as value");
  });

  it("skips locale silently when not in catalogue available_locales", async () => {
    const itOnlyLocalization: LocalizationInfo = {
      ...catalogueLocalization,
      available_locales: ["it"],
    };

    const result = await fetchTranslations(
      { catalogue: itOnlyLocalization, authenticSources: asLocalization },
      ["it", "en"],
      { appFetch: makeFetch(bundleMap) }
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

    const result = await fetchTranslations(
      {
        catalogue: itOnlyLocalization,
        authenticSources: itOnlyAsLocalization,
      },
      ["it", "en"],
      { appFetch: makeFetch(bundleMap) }
    );

    expect(result).toHaveProperty("it");
    expect(result).not.toHaveProperty("en");
  });

  it("works with only catalogue localization provided", async () => {
    const result = await fetchTranslations(
      { catalogue: catalogueLocalization },
      ["it"],
      { appFetch: makeFetch(bundleMap) }
    );

    expect(result.it).toMatchObject({ "mDL.name": "Patente di Guida" });
    expect(result.it).not.toHaveProperty("as1.name");
  });

  it("works with only authenticSources localization provided", async () => {
    const result = await fetchTranslations(
      { authenticSources: asLocalization },
      ["it"],
      { appFetch: makeFetch(bundleMap) }
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
});
