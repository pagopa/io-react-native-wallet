import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React from "react";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  selectCredential,
  selectCredentialAsyncStatus,
} from "../store/reducers/credential";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getCredentialThunk } from "../thunks/credential";

/**
 * Component (screen in a future PR) to test the credential functionalities.
 * This includes issuing a credential and getting its status attestation.
 */
// eslint-disable-next-line max-lines-per-function
export const CredentialScreen = () => {
  const dispatch = useAppDispatch();

  const sd_jwt_mdlState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_mDL"),
  );
  const sd_jwt_mdl = useAppSelector(selectCredential("dc_sd_jwt_mDL"));

  const mdoc_mdlState = useAppSelector(
    selectCredentialAsyncStatus("mso_mdoc_mDL"),
  );
  const mdoc_mdl = useAppSelector(selectCredential("mso_mdoc_mDL"));

  const dcState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_EuropeanDisabilityCard"),
  );
  const dc = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanDisabilityCard"),
  );

  const tsState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_EuropeanHealthInsuranceCard"),
  );
  const ts = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanHealthInsuranceCard"),
  );

  const edState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_education_degree"),
  );
  const ed = useAppSelector(selectCredential("dc_sd_jwt_education_degree"));

  const eeState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_education_enrollment"),
  );
  const ee = useAppSelector(selectCredential("dc_sd_jwt_education_enrollment"));

  const resState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_residency"),
  );
  const res = useAppSelector(selectCredential("dc_sd_jwt_residency"));

  const edipState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_education_diploma"),
  );
  const edip = useAppSelector(selectCredential("dc_sd_jwt_education_diploma"));

  const edatState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_education_attendance"),
  );
  const edat = useAppSelector(
    selectCredential("dc_sd_jwt_education_attendance"),
  );

  const poaState = useAppSelector(
    selectCredentialAsyncStatus("mso_mdoc_proof_of_age"),
  );
  const poa = useAppSelector(selectCredential("mso_mdoc_proof_of_age"));

  useDebugInfo({
    dc,
    dcState,
    ed,
    edat,
    edatState,
    edip,
    edipState,
    edState,
    ee,
    eeState,
    mdoc_mdl,
    mdoc_mdlState,
    poa,
    poaState,
    res,
    resState,
    sd_jwt_mdl,
    sd_jwt_mdlState,
    ts,
    tsState,
  });

  const scenarios: TestScenarioProp[] = [
    {
      hasError: sd_jwt_mdlState.hasError,
      icon: "car",
      isDone: sd_jwt_mdlState.isDone,
      isLoading: sd_jwt_mdlState.isLoading,
      isPresent: !!sd_jwt_mdl,
      onPress: () =>
        dispatch(getCredentialThunk({ credentialType: "dc_sd_jwt_mDL" })),
      title: "Get credential (MDL in SD-JWT)",
    },
    {
      hasError: mdoc_mdlState.hasError,
      icon: "car",
      isDone: mdoc_mdlState.isDone,
      isLoading: mdoc_mdlState.isLoading,
      isPresent: !!mdoc_mdl,
      onPress: () =>
        dispatch(getCredentialThunk({ credentialType: "mso_mdoc_mDL" })),
      title: "Get credential (MDL in Mdoc)",
    },
    {
      hasError: dcState.hasError,
      icon: "accessibility",
      isDone: dcState.isDone,
      isLoading: dcState.isLoading,
      isPresent: !!dc,
      onPress: () =>
        dispatch(
          getCredentialThunk({
            credentialType: "dc_sd_jwt_EuropeanDisabilityCard",
          }),
        ),
      title: "Get credential (DC in SD-JWT)",
    },
    {
      hasError: tsState.hasError,
      icon: "healthCard",
      isDone: tsState.isDone,
      isLoading: tsState.isLoading,
      isPresent: !!ts,
      onPress: () =>
        dispatch(
          getCredentialThunk({
            credentialType: "dc_sd_jwt_EuropeanHealthInsuranceCard",
          }),
        ),
      title: "Get credential (TS in SD-JWT)",
    },
    {
      hasError: edState.hasError,
      icon: "messageLegal",
      isDone: edState.isDone,
      isLoading: edState.isLoading,
      isPresent: !!ed,
      onPress: () =>
        dispatch(
          getCredentialThunk({
            credentialType: "dc_sd_jwt_education_degree",
          }),
        ),
      title: "Get credential (Education degrees in SD-JWT)",
    },
    {
      hasError: eeState.hasError,
      icon: "messageLegal",
      isDone: eeState.isDone,
      isLoading: eeState.isLoading,
      isPresent: !!ee,
      onPress: () =>
        dispatch(
          getCredentialThunk({
            credentialType: "dc_sd_jwt_education_enrollment",
          }),
        ),
      title: "Get credential (Education enrollment in SD-JWT)",
    },
    {
      hasError: resState.hasError,
      icon: "messageLegal",
      isDone: resState.isDone,
      isLoading: resState.isLoading,
      isPresent: !!res,
      onPress: () =>
        dispatch(
          getCredentialThunk({
            credentialType: "dc_sd_jwt_residency",
          }),
        ),
      title: "Get credential (Residency in SD-JWT)",
    },
    {
      hasError: edipState.hasError,
      icon: "messageLegal",
      isDone: edipState.isDone,
      isLoading: edipState.isLoading,
      isPresent: !!edip,
      onPress: () =>
        dispatch(
          getCredentialThunk({
            credentialType: "dc_sd_jwt_education_diploma",
          }),
        ),
      title: "Get credential (Education diploma in SD-JWT)",
    },
    {
      hasError: edatState.hasError,
      icon: "messageLegal",
      isDone: edatState.isDone,
      isLoading: edatState.isLoading,
      isPresent: !!edat,
      onPress: () =>
        dispatch(
          getCredentialThunk({
            credentialType: "dc_sd_jwt_education_attendance",
          }),
        ),
      title: "Get credential (Education attendance in SD-JWT)",
    },
    {
      hasError: poaState.hasError,
      icon: "ok",
      isDone: poaState.isDone,
      isLoading: poaState.isLoading,
      isPresent: !!poa,
      onPress: () =>
        dispatch(
          getCredentialThunk({
            batchSize: 5,
            credentialType: "mso_mdoc_proof_of_age",
          }),
        ),
      title: "Get credentials batch (Proof of age for AV)",
    },
  ];

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={scenarios}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        ListFooterComponent={<VSpacer size={32} />}
        renderItem={({ item }) => (
          <>
            <TestScenario
              hasError={item.hasError}
              icon={item.icon}
              isDone={item.isDone}
              isLoading={item.isLoading}
              isPresent={item.isPresent}
              onPress={item.onPress}
              title={item.title}
            />
            <VSpacer />
          </>
        )}
      />
    </SafeAreaView>
  );
};
