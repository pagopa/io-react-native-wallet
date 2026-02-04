import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React, { useCallback, useMemo } from "react";
import { FlatList, View, type ListRenderItemInfo } from "react-native";
import type { TestScenarioProp } from "../components/TestScenario";
import TestScenario from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getCredentialsCatalogueThunk } from "../thunks/credentialsCatalogue";
import {
  selectCredentialsCatalogue,
  selectCredentialsCatalogueAsyncStatus,
} from "../store/reducers/credentialsCatalogue";

export const CredentialsCatalogueScreen = () => {
  const asyncStatus = useAppSelector(selectCredentialsCatalogueAsyncStatus);
  const credentialsCatalogue = useAppSelector(selectCredentialsCatalogue);

  const dispatch = useAppDispatch();

  useDebugInfo({ asyncStatus, credentialsCatalogue });

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
    ],
    [dispatch, asyncStatus, credentialsCatalogue]
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
