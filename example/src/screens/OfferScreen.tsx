import {
  IOVisualCostants,
  ModuleCredential,
  VSpacer,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo } from "react";
import { FlatList, type ListRenderItemInfo, View } from "react-native";
import type { TestScenarioProp } from "../components/TestScenario";
import TestScenario from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  credentialOfferReset,
  selectCredentialOfferDetails,
  selectCredentialOfferResult,
  selectCredentialOfferState,
} from "../store/reducers/offer";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { useOffer } from "../components/offer/useOffer";
import { getCredentialOfferFlowThunk } from "../thunks/offer";

export const OfferScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const { asyncStatus: credentialOfferState } = useAppSelector(
    selectCredentialOfferState
  );
  const credentialOfferResult = useAppSelector(selectCredentialOfferResult);
  const credentialOfferDetails = useAppSelector(selectCredentialOfferDetails);

  useDebugInfo({
    credentialOfferState,
    credentialOfferResult,
  });
  const { component, requestTxCode } = useOffer();

  useEffect(() => {
    return () => {
      dispatch(credentialOfferReset());
    };
  }, [dispatch]);

  useEffect(() => {
    if (
      credentialOfferState.isDone &&
      credentialOfferDetails &&
      !credentialOfferResult &&
      !credentialOfferState.isLoading
    ) {
      const { grant, offer: offerData, issuerConf } = credentialOfferDetails;

      if (grant.type === "pre-authorized_code") {
        requestTxCode(async (txCode: string) => {
          console.log("Received txCode:", txCode);

          await dispatch(
            getCredentialOfferFlowThunk({
              offer: offerData,
              grant: grant,
              issuerConf: issuerConf,
              txCode: txCode,
            })
          );
        });
      } else {
        dispatch(
          getCredentialOfferFlowThunk({
            offer: offerData,
            grant: grant,
            issuerConf: issuerConf,
          })
        );
      }
    }
  }, [
    credentialOfferState.isDone,
    credentialOfferState.isLoading,
    credentialOfferDetails,
    credentialOfferResult,
    dispatch,
    requestTxCode,
  ]);

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
        isPresent: !!credentialOfferResult,
        successMessage: "OK",
      },
    ],
    [
      credentialOfferState.isLoading,
      credentialOfferState.hasError,
      credentialOfferState.isDone,
      credentialOfferResult,
      navigation,
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
      {component}
      <View
        style={{
          margin: IOVisualCostants.appMarginDefault,
        }}
      >
        <ModuleCredential
          label="Explore Credentials"
          icon={"archive"}
          onPress={() => navigation.navigate("ExploreCredentials")}
        />
      </View>
    </View>
  );
};
