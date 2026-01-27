import type { CredentialsCatalogueApi } from "../api";
import { fetchAndParseCatalogue } from "./fetch-and-parse-catalogue";

export const CredentialsCatalogue: CredentialsCatalogueApi = {
  fetchAndParseCatalogue,
};
