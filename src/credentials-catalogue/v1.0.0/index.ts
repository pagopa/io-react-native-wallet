import type { CredentialsCatalogueApi } from "../api";
import { fetchAndParseCatalogue } from "./fetch-and-parse-catalogue";
import { getStatusL10nIds } from "../common/get-status-l10n-ids";

export const CredentialsCatalogue: CredentialsCatalogueApi = {
  fetchAndParseCatalogue,
  getStatusL10nIds,
};
