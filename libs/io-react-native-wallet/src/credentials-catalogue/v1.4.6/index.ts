import type { CredentialsCatalogueApi } from "../api";

import { getStatusL10nIds } from "../common/get-status-l10n-ids";
import { fetchAndParseCatalogue } from "./fetch-and-parse-catalogue";
import { fetchTranslations } from "./fetch-translations";

export const CredentialsCatalogue: CredentialsCatalogueApi = {
  fetchAndParseCatalogue,
  fetchTranslations,
  getStatusL10nIds,
};
