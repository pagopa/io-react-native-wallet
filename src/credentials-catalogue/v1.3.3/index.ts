import type { CredentialsCatalogueApi } from "../api";
import { fetchAndParseCatalogue } from "./fetch-and-parse-catalogue";
import { fetchTranslations } from "./fetch-translations";

export const CredentialsCatalogue: CredentialsCatalogueApi = {
  fetchAndParseCatalogue,
  fetchTranslations,
};
