import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React, { useMemo } from "react";
import { FlatList } from "react-native";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectCredentials } from "../store/reducers/credential";
import {
  selectTrustmark,
  selectTrustmarkAsyncStatus,
} from "../store/reducers/trustmark";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getTrustmarkThunk } from "../thunks/trustmark";

/**
 * This component (screen in a future PR) is used to test the status attestation functionalities for the credentials already obtained.
 */
export const TrustmarkScreen = () => {
  const dispatch = useAppDispatch();
  const credentials = useAppSelector(selectCredentials);
  const trustmark = useAppSelector(selectTrustmark);
  const trustmarkAsyncStatus = useAppSelector(selectTrustmarkAsyncStatus);

  useDebugInfo({
    credentials,
    trustmark,
    trustmarkAsyncStatus,
  });

  const scenarios: Array<TestScenarioProp | undefined> = useMemo(
    () => [
      credentials.EuropeanHealthInsuranceCard
        ? {
            title: "Get Trustmark (TS)",
            onPress: () =>
              dispatch(
                getTrustmarkThunk({
                  credentialType: "EuropeanHealthInsuranceCard",
                })
              ),
            isLoading: trustmarkAsyncStatus.isLoading,
            hasError: trustmarkAsyncStatus.hasError,
            isDone: trustmarkAsyncStatus.isDone,
            icon: "healthCard",
          }
        : undefined,
    ],
    [dispatch, credentials, trustmarkAsyncStatus]
  );

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={scenarios}
      keyExtractor={(item, index) => `${item?.title}-${index}`}
      renderItem={({ item }) => (
        <>
          {item && (
            <>
              <TestScenario
                onPress={item.onPress}
                title={item.title}
                isLoading={item.isLoading}
                hasError={item.hasError}
                isDone={item.isDone}
                icon={item.icon}
                isPresent={item.isPresent}
              />
              <VSpacer />
            </>
          )}
        </>
      )}
    />
  );
};
