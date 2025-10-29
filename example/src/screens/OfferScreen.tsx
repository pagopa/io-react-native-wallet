import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo } from "react";
import { FlatList, View, type ListRenderItemInfo } from "react-native";
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
    credentialOfferState,
    credentialOfferDetails,
  });

  useEffect(() => {
    return () => {
      dispatch(credentialOfferReset());
    };
  }, [dispatch]);

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        title: "Scan Credential Offer QR Code",
        onPress: () =>
          navigation.navigate("QrScanner", {
            mode: "offer",
          }),
        isLoading: credentialOfferState.isLoading,
        hasError: credentialOfferState.hasError,
        isDone: credentialOfferState.isDone,
        icon: "qrCode",
        isPresent: !!credentialOfferDetails.offer,
        successMessage: "OK",
      },
    ],
    [
      navigation,
      credentialOfferState.hasError,
      credentialOfferState.isDone,
      credentialOfferState.isLoading,
      credentialOfferDetails.offer,
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
