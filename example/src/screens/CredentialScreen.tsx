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

  const edState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_education_degree")
  );
  const ed = useAppSelector(selectCredential("dc_sd_jwt_education_degree"));

  const eeState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_education_enrollment")
  );
  const ee = useAppSelector(selectCredential("dc_sd_jwt_education_enrollment"));

  const resState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_residency")
  );
  const res = useAppSelector(selectCredential("dc_sd_jwt_residency"));

  const edipState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_education_diploma")
  );
  const edip = useAppSelector(selectCredential("dc_sd_jwt_education_diploma"));

  const edatState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_education_attestation")
  );
  const edat = useAppSelector(
    selectCredential("dc_sd_jwt_education_attestation")
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
    edState,
    ed,
    eeState,
    ee,
    resState,
    res,
    edipState,
    edip,
    edatState,
    edat,
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
      {
        title: "Get credential (Education degrees in SD-JWT)",
        onPress: () =>
          dispatch(
            getCredentialThunk({
              credentialType: "dc_sd_jwt_education_degree",
            })
          ),
        isLoading: edState.isLoading,
        hasError: edState.hasError,
        isDone: edState.isDone,
        icon: "messageLegal",
        isPresent: !!ed,
      },
      {
        title: "Get credential (Education enrollment in SD-JWT)",
        onPress: () =>
          dispatch(
            getCredentialThunk({
              credentialType: "dc_sd_jwt_education_enrollment",
            })
          ),
        isLoading: eeState.isLoading,
        hasError: eeState.hasError,
        isDone: eeState.isDone,
        icon: "messageLegal",
        isPresent: !!ee,
      },
      {
        title: "Get credential (Residency in SD-JWT)",
        onPress: () =>
          dispatch(
            getCredentialThunk({
              credentialType: "dc_sd_jwt_residency",
            })
          ),
        isLoading: resState.isLoading,
        hasError: resState.hasError,
        isDone: resState.isDone,
        icon: "messageLegal",
        isPresent: !!res,
      },
      {
        title: "Get credential (Education diploma in SD-JWT)",
        onPress: () =>
          dispatch(
            getCredentialThunk({
              credentialType: "dc_sd_jwt_education_diploma",
            })
          ),
        isLoading: edipState.isLoading,
        hasError: edipState.hasError,
        isDone: edipState.isDone,
        icon: "messageLegal",
        isPresent: !!edip,
      },
      {
        title: "Get credential (Education attestation in SD-JWT)",
        onPress: () =>
          dispatch(
            getCredentialThunk({
              credentialType: "dc_sd_jwt_education_attestation",
            })
          ),
        isLoading: edatState.isLoading,
        hasError: edatState.hasError,
        isDone: edatState.isDone,
        icon: "messageLegal",
        isPresent: !!edat,
      },
    ],
    [
      sd_jwt_mdlState.isLoading,
      sd_jwt_mdlState.hasError,
      sd_jwt_mdlState.isDone,
      sd_jwt_mdl,
      mdoc_mdlState.isLoading,
      mdoc_mdlState.hasError,
      mdoc_mdlState.isDone,
      mdoc_mdl,
      dcState.isLoading,
      dcState.hasError,
      dcState.isDone,
      dc,
      tsState.isLoading,
      tsState.hasError,
      tsState.isDone,
      ts,
      edState.isLoading,
      edState.hasError,
      edState.isDone,
      ed,
      eeState.isLoading,
      eeState.hasError,
      eeState.isDone,
      ee,
      resState.isLoading,
      resState.hasError,
      resState.isDone,
      res,
      edipState.isLoading,
      edipState.hasError,
      edipState.isDone,
      edip,
      edatState.isLoading,
      edatState.hasError,
      edatState.isDone,
      edat,
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
