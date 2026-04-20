import type { CredentialsCatalogueApi } from "../api";
import { fetchAndParseCatalogue } from "./fetch-and-parse-catalogue";
import { IoWalletError } from "../../utils/errors";

export const CredentialsCatalogue: CredentialsCatalogueApi = {
  fetchAndParseCatalogue,
  fetchTranslations: () => {
    throw new IoWalletError(
      "fetchTranslations is not supported in v1.0.0 (no localization metadata)"
    );
  },
};
