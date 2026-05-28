import type { CredentialsCatalogueApi } from "../api";
import { fetchAndParseCatalogue } from "./fetch-and-parse-catalogue";
import { fetchTranslations } from "./fetch-translations";
import { getStatusL10nIds } from "../common/get-status-l10n-ids";

export const CredentialsCatalogue: CredentialsCatalogueApi = {
  fetchAndParseCatalogue,
  fetchTranslations,
  getStatusL10nIds,
};
