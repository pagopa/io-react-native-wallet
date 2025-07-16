import React, { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  selectCredential,
  selectCredentialAsyncStatus,
} from "../store/reducers/credential";
import { getCredentialThunk } from "../thunks/credential";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { FlatList } from "react-native";
import { useDebugInfo } from "../hooks/useDebugInfo";

/**
 * Component (screen in a future PR) to test the credential functionalities.
 * This includes issuing a credential and getting its status attestation.
 */
export const CredentialScreen = () => {
  const dispatch = useAppDispatch();

  const sd_jwt_mdlState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_mDL")
  );
  const sd_jwt_mdl = useAppSelector(selectCredential("dc_sd_jwt_mDL"));

  const mdoc_mdlState = useAppSelector(
    selectCredentialAsyncStatus("mso_mdoc_mDL")
  );
  const mdoc_mdl = useAppSelector(selectCredential("mso_mdoc_mDL"));

  const dcState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_EuropeanDisabilityCard")
  );
  const dc = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanDisabilityCard")
  );

  const tsState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_EuropeanHealthInsuranceCard")
  );
  const ts = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanHealthInsuranceCard")
  );

  useDebugInfo({
    sd_jwt_mdlState,
    sd_jwt_mdl,
    mdoc_mdlState,
    mdoc_mdl,
    dcState,
    dc,
    tsState,
    ts,
  });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        title: "Get credential (MDL in SD-JWT)",
        onPress: () =>
          dispatch(getCredentialThunk({ credentialType: "dc_sd_jwt_mDL" })),
        isLoading: sd_jwt_mdlState.isLoading,
        hasError: sd_jwt_mdlState.hasError,
        isDone: sd_jwt_mdlState.isDone,
        icon: "car",
        isPresent: !!sd_jwt_mdl,
      },
      {
        title: "Get credential (MDL in Mdoc)",
        onPress: () =>
          dispatch(getCredentialThunk({ credentialType: "mso_mdoc_mDL" })),
        isLoading: mdoc_mdlState.isLoading,
        hasError: mdoc_mdlState.hasError,
        isDone: mdoc_mdlState.isDone,
        icon: "car",
        isPresent: !!mdoc_mdl,
      },
      {
        title: "Get credential (DC in SD-JWT)",
        onPress: () =>
          dispatch(
            getCredentialThunk({
              credentialType: "dc_sd_jwt_EuropeanDisabilityCard",
            })
          ),
        isLoading: dcState.isLoading,
        hasError: dcState.hasError,
        isDone: dcState.isDone,
        icon: "accessibility",
        isPresent: !!dc,
      },
      {
        title: "Get credential (TS in SD-JWT)",
        onPress: () =>
          dispatch(
            getCredentialThunk({
              credentialType: "dc_sd_jwt_EuropeanHealthInsuranceCard",
            })
          ),
        isLoading: tsState.isLoading,
        hasError: tsState.hasError,
        isDone: tsState.isDone,
        icon: "healthCard",
        isPresent: !!ts,
      },
    ],
    [
      dc,
      dcState.hasError,
      dcState.isDone,
      dcState.isLoading,
      mdoc_mdl,
      mdoc_mdlState.hasError,
      mdoc_mdlState.isDone,
      mdoc_mdlState.isLoading,
      sd_jwt_mdl,
      sd_jwt_mdlState.hasError,
      sd_jwt_mdlState.isDone,
      sd_jwt_mdlState.isLoading,
      ts,
      tsState.hasError,
      tsState.isDone,
      tsState.isLoading,
      dispatch,
    ]
  );

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={scenarios}
      keyExtractor={(item, index) => `${item.title}-${index}`}
      renderItem={({ item }) => (
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
    />
  );
};
