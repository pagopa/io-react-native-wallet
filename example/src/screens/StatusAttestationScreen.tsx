import React, { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  selectCredential,
  selectStatusAttestation,
  selectStatusAttestationAsyncStatus,
} from "../store/reducers/credential";
import { getCredentialStatusAttestationThunk } from "../thunks/credential";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { FlatList } from "react-native";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useDebugInfo } from "../hooks/useDebugInfo";

/**
 * This component (screen in a future PR) is used to test the status attestation functionalities for the credentials already obtained.
 */
export const StatusAttestationScreen = () => {
  const dispatch = useAppDispatch();
  const mDl = useAppSelector(selectCredential("dc_sd_jwt_mDL"));
  const mdlStatAttState = useAppSelector(
    selectStatusAttestationAsyncStatus("dc_sd_jwt_mDL")
  );
  const mdlStatusAttestation = useAppSelector(
    selectStatusAttestation("dc_sd_jwt_mDL")
  );

  useDebugInfo({
    mdlStatusAttestationState: mdlStatAttState,
    mdlStatusAttestation,
  });

  const scenarios: Array<TestScenarioProp | undefined> = useMemo(
    () => [
      mDl
        ? {
            title: "Get Status Attestation (MDL)",
            onPress: () =>
              dispatch(
                getCredentialStatusAttestationThunk({
                  credentialType: "dc_sd_jwt_mDL",
                  credential: mDl.credential,
                  keyTag: mDl.keyTag,
                })
              ),
            isLoading: mdlStatAttState.isLoading,
            hasError: mdlStatAttState.hasError,
            isDone: mdlStatAttState.isDone,
            icon: "car",
            isPresent: !!mdlStatusAttestation,
          }
        : undefined,
    ],
    [
      dispatch,
      mDl,
      mdlStatAttState.hasError,
      mdlStatAttState.isDone,
      mdlStatAttState.isLoading,
      mdlStatusAttestation,
    ]
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
