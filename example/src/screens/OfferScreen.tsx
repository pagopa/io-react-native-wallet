import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo } from "react";
import { FlatList, type ListRenderItemInfo, View } from "react-native";

import type { TestScenarioProp } from "../components/TestScenario";

import TestScenario from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  credentialOfferReset,
  selectCredentialOfferState,
} from "../store/reducers/offer";
import { useAppDispatch, useAppSelector } from "../store/utils";

export const OfferScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const { asyncStatus: credentialOfferState, ...credentialOfferDetails } =
    useAppSelector(selectCredentialOfferState);

  useDebugInfo({
    credentialOfferDetails,
    credentialOfferState,
  });

  useEffect(
    () => () => {
      dispatch(credentialOfferReset());
    },
    [dispatch],
  );

  const scenarios: TestScenarioProp[] = useMemo(
    () => [
      {
        hasError: credentialOfferState.hasError,
        icon: "qrCode",
        isDone: credentialOfferState.isDone,
        isLoading: credentialOfferState.isLoading,
        isPresent: !!credentialOfferDetails.offer,
        onPress: () =>
          navigation.navigate("QrScanner", {
            mode: "offer",
          }),
        successMessage: "OK",
        title: "Scan Credential Offer QR Code",
      },
    ],
    [
      navigation,
      credentialOfferState.hasError,
      credentialOfferState.isDone,
      credentialOfferState.isLoading,
      credentialOfferDetails.offer,
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
