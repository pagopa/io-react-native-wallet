import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React, { useCallback, useMemo } from "react";
import { FlatList, View, type ListRenderItemInfo } from "react-native";
import type { TestScenarioProp } from "../components/TestScenario";
import TestScenario from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  getCredentialsCatalogueThunk,
  getCredentialsCatalogueTranslationsThunk,
} from "../thunks/credentialsCatalogue";
import {
  selectCredentialsCatalogue,
  selectCredentialsCatalogueAsyncStatus,
  selectCredentialsCatalogueTranslations,
  selectCredentialsCatalogueTranslationsAsyncStatus,
} from "../store/reducers/credentialsCatalogue";

export const CredentialsCatalogueScreen = () => {
  const asyncStatus = useAppSelector(selectCredentialsCatalogueAsyncStatus);
  const credentialsCatalogue = useAppSelector(selectCredentialsCatalogue);
  const translationsAsyncStatus = useAppSelector(
    selectCredentialsCatalogueTranslationsAsyncStatus
  );
  const translations = useAppSelector(selectCredentialsCatalogueTranslations);

  const dispatch = useAppDispatch();

  useDebugInfo({ asyncStatus, credentialsCatalogue, translationsAsyncStatus, translations });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        title: "Fetch Credentials Catalogue",
        onPress: () => {
          dispatch(getCredentialsCatalogueThunk());
        },
        isLoading: asyncStatus.isLoading,
        hasError: asyncStatus.hasError,
        isDone: asyncStatus.isDone,
        icon: "instruction",
        isPresent: !!credentialsCatalogue,
        successMessage: "OK",
      },
      {
        title: "Fetch Catalogue Translations (it)",
        onPress: () => {
          dispatch(getCredentialsCatalogueTranslationsThunk());
        },
        isLoading: translationsAsyncStatus.isLoading,
        hasError: translationsAsyncStatus.hasError,
        isDone: translationsAsyncStatus.isDone,
        icon: "attachment",
        isPresent: !!translations,
        successMessage: `Fetched locales: ${Object.keys(translations ?? {}).join(", ") || "none"}`,
      },
    ],
    [
      dispatch,
      asyncStatus,
      credentialsCatalogue,
      translationsAsyncStatus,
      translations,
    ]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TestScenarioProp>) => (
      <TestScenario {...item} />
    ),
    []
  );
  return (
    <View>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={scenarios}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        renderItem={renderItem}
        ItemSeparatorComponent={VSpacer}
      />
    </View>
  );
};
