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
import { selectPid } from "../store/reducers/pid";

/**
 * This component (screen in a future PR) is used to test the status attestation functionalities for the credentials already obtained.
 */
export const StatusAttestationScreen = () => {
  const dispatch = useAppDispatch();

  const pidStatusAttestation = useAppSelector(
    selectStatusAttestation("PersonIdentificationData")
  );
  const pidStatAttState = useAppSelector(
    selectStatusAttestationAsyncStatus("PersonIdentificationData")
  );

  const mDl = useAppSelector(selectCredential("dc_sd_jwt_mDL"));
  const mdlStatAttState = useAppSelector(
    selectStatusAttestationAsyncStatus("dc_sd_jwt_mDL")
  );
  const mdlStatusAttestation = useAppSelector(
    selectStatusAttestation("dc_sd_jwt_mDL")
  );

  const dc = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanDisabilityCard")
  );
  const dcStatAttState = useAppSelector(
    selectStatusAttestationAsyncStatus("dc_sd_jwt_EuropeanDisabilityCard")
  );
  const dcStatusAttestation = useAppSelector(
    selectStatusAttestation("dc_sd_jwt_EuropeanDisabilityCard")
  );
  const pid = useAppSelector(selectPid);

  useDebugInfo({
    mdlStatusAttestationState: mdlStatAttState,
    pidStatusAttestationState: pidStatAttState,
    mdlStatusAttestation,
    pidStatusAttestation,
  });

  const scenarios: Array<TestScenarioProp | undefined> = useMemo(
    () => [
      pid && {
        title: "Get Status Attestation (PID)",
        onPress: () =>
          dispatch(
            getCredentialStatusAttestationThunk({
              credentialType: "PersonIdentificationData",
              credential: pid.credential,
              keyTag: pid.keyTag,
            })
          ),
        isLoading: pidStatAttState.isLoading,
        hasError: pidStatAttState.hasError,
        isDone: pidStatAttState.isDone,
        icon: "fiscalCodeIndividual",
        isPresent: !!pidStatusAttestation,
      },
      mDl && {
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
      },
      dc && {
        title: "Get Status Attestation (DC)",
        onPress: () =>
          dispatch(
            getCredentialStatusAttestationThunk({
              credentialType: "dc_sd_jwt_EuropeanDisabilityCard",
              credential: dc.credential,
              keyTag: dc.keyTag,
            })
          ),
        isLoading: dcStatAttState.isLoading,
        hasError: dcStatAttState.hasError,
        isDone: dcStatAttState.isDone,
        icon: "accessibility",
        isPresent: !!dcStatusAttestation,
      },
    ],
    [
      dispatch,
      mDl,
      mdlStatAttState,
      mdlStatusAttestation,
      pid,
      pidStatAttState,
      pidStatusAttestation,
      dc,
      dcStatAttState,
      dcStatusAttestation,
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
