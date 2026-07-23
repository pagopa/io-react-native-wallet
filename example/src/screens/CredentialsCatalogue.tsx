import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React, { useCallback, useMemo } from "react";
import { FlatList, type ListRenderItemInfo, View } from "react-native";

import type { TestScenarioProp } from "../components/TestScenario";

import TestScenario from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  selectCredentialsCatalogue,
  selectCredentialsCatalogueAsyncStatus,
  selectCredentialsCatalogueTranslations,
  selectCredentialsCatalogueTranslationsAsyncStatus,
} from "../store/reducers/credentialsCatalogue";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  getCredentialsCatalogueThunk,
  getCredentialsCatalogueTranslationsThunk,
} from "../thunks/credentialsCatalogue";

export const CredentialsCatalogueScreen = () => {
  const asyncStatus = useAppSelector(selectCredentialsCatalogueAsyncStatus);
  const credentialsCatalogue = useAppSelector(selectCredentialsCatalogue);
  const translationsAsyncStatus = useAppSelector(
    selectCredentialsCatalogueTranslationsAsyncStatus,
  );
  const translations = useAppSelector(selectCredentialsCatalogueTranslations);

  const dispatch = useAppDispatch();

  useDebugInfo({
    asyncStatus,
    credentialsCatalogue,
    translations,
    translationsAsyncStatus,
  });

  const scenarios: TestScenarioProp[] = useMemo(
    () => [
      {
        hasError: asyncStatus.hasError,
        icon: "instruction",
        isDone: asyncStatus.isDone,
        isLoading: asyncStatus.isLoading,
        isPresent: !!credentialsCatalogue,
        onPress: () => {
          dispatch(getCredentialsCatalogueThunk());
        },
        successMessage: "OK",
        title: "Fetch Credentials Catalogue",
      },
      {
        hasError: translationsAsyncStatus.hasError,
        icon: "attachment",
        isDone: translationsAsyncStatus.isDone,
        isLoading: translationsAsyncStatus.isLoading,
        isPresent: !!translations,
        onPress: () => {
          dispatch(getCredentialsCatalogueTranslationsThunk());
        },
        successMessage: `Fetched locales: ${Object.keys(translations ?? {}).join(", ") || "none"}`,
        title: "Fetch Catalogue Translations (it)",
      },
    ],
    [
      dispatch,
      asyncStatus,
      credentialsCatalogue,
      translationsAsyncStatus,
      translations,
    ],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TestScenarioProp>) => (
      <TestScenario {...item} />
    ),
    [],
  );
  return (
    <View>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={scenarios}
        ItemSeparatorComponent={VSpacer}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        renderItem={renderItem}
      />
    </View>
  );
};
