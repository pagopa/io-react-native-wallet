import type { CredentialsCatalogueApi } from "../api";

import { getStatusL10nIds } from "../common/get-status-l10n-ids";
import { fetchAndParseCatalogue } from "./fetch-and-parse-catalogue";

export const CredentialsCatalogue: CredentialsCatalogueApi = {
  fetchAndParseCatalogue,
  getStatusL10nIds,
};
