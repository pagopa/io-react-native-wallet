import React from "react";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  selectCredential,
  selectStatusAssertionAsyncStatuses,
  selectStatusAssertions,
} from "../store/reducers/credential";
import { getCredentialStatusAssertionThunk } from "../thunks/credential";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { FlatList } from "react-native";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectPid } from "../store/reducers/pid";

/**
 * This component (screen in a future PR) is used to test the status assertion functionalities for the credentials already obtained.
 */
export const StatusAssertionScreen = () => {
  const dispatch = useAppDispatch();

  const statusAssertion = useAppSelector(selectStatusAssertions);
  const asyncStatus = useAppSelector(selectStatusAssertionAsyncStatuses);

  const pid = useAppSelector(selectPid);
  const mDL = useAppSelector(selectCredential("dc_sd_jwt_mDL"));
  const dc = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanDisabilityCard")
  );

  useDebugInfo({
    pidStatusAssertionState: asyncStatus.PersonIdentificationData,
    mdlStatusAssertionState: asyncStatus.dc_sd_jwt_mDL,
    dcStatusAssertionState: asyncStatus.dc_sd_jwt_EuropeanDisabilityCard,
    pidStatusAssertion: statusAssertion.PersonIdentificationData,
    mdlStatusAssertion: statusAssertion.dc_sd_jwt_mDL,
    dcStatusAssertion: statusAssertion.dc_sd_jwt_EuropeanDisabilityCard,
  });

  const scenarios: Array<TestScenarioProp | undefined> = [
    pid && {
      title: "Get Status Assertion (PID)",
      onPress: () =>
        dispatch(
          getCredentialStatusAssertionThunk({
            credentialType: "PersonIdentificationData",
            credential: pid.credential,
            keyTag: pid.keyTag,
          })
        ),
      ...asyncStatus.PersonIdentificationData,
      icon: "fiscalCodeIndividual",
      isPresent: !!statusAssertion.PersonIdentificationData,
    },
    mDL && {
      title: "Get Status Assertion (MDL)",
      onPress: () =>
        dispatch(
          getCredentialStatusAssertionThunk({
            credentialType: "dc_sd_jwt_mDL",
            credential: mDL.credential,
            keyTag: mDL.keyTag,
          })
        ),
      ...asyncStatus.dc_sd_jwt_mDL,
      icon: "car",
      isPresent: !!statusAssertion.dc_sd_jwt_mDL,
    },
    dc && {
      title: "Get Status Assertion (DC)",
      onPress: () =>
        dispatch(
          getCredentialStatusAssertionThunk({
            credentialType: "dc_sd_jwt_EuropeanDisabilityCard",
            credential: dc.credential,
            keyTag: dc.keyTag,
          })
        ),
      ...asyncStatus.dc_sd_jwt_EuropeanDisabilityCard,
      icon: "accessibility",
      isPresent: !!statusAssertion.dc_sd_jwt_EuropeanDisabilityCard,
    },
  ];

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
