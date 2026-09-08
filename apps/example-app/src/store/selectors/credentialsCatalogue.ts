import type { CredentialsCatalogue } from "@io-app-it-wallet/io-react-native-wallet";

import type { AsyncStatus, RootState } from "../types";

export const selectCredentialsCatalogueAsyncStatus = (
  state: RootState,
): AsyncStatus => state.credentialsCatalogue.asyncStatus;

export const selectCredentialsCatalogue = (
  state: RootState,
): CredentialsCatalogue.DigitalCredentialsCatalogue | undefined =>
  state.credentialsCatalogue.catalogue;

export const selectCredentialsCatalogueTranslations = (
  state: RootState,
): CredentialsCatalogue.CatalogueTranslations | undefined =>
  state.credentialsCatalogue.translations;

export const selectCredentialsCatalogueTranslationsAsyncStatus = (
  state: RootState,
): AsyncStatus => state.credentialsCatalogue.translationsAsyncStatus;
