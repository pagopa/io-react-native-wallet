import React, { useMemo } from "react";
import { IoWallet } from "@pagopa/io-react-native-wallet";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  selectCredential,
  selectStatusAsyncStatuses,
  selectStatuses,
} from "../store/reducers/credential";
import {
  getCredentialStatusAssertionThunk,
  getCredentialStatusListThunk,
} from "../thunks/credential";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { FlatList } from "react-native";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectPid } from "../store/reducers/pid";
import { selectItwVersion } from "../store/reducers/environment";

/**
 * This screen is used to test the status functionalities for the credentials already obtained.
 */
export const CredentialStatusScreen = () => {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectStatuses);
  const asyncStatus = useAppSelector(selectStatusAsyncStatuses);

  const pid = useAppSelector(selectPid);
  const mDL = useAppSelector(selectCredential("dc_sd_jwt_mDL"));
  const dc = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanDisabilityCard")
  );

  const itwVersion = useAppSelector(selectItwVersion);

  const wallet = useMemo(
    () => new IoWallet({ version: itwVersion }),
    [itwVersion]
  );

  useDebugInfo({
    pidStatusState: asyncStatus.PersonIdentificationData,
    mdlStatusState: asyncStatus.dc_sd_jwt_mDL,
    dcStatusState: asyncStatus.dc_sd_jwt_EuropeanDisabilityCard,
    pidStatus: status.PersonIdentificationData,
    mdlStatus: status.dc_sd_jwt_mDL,
    dcStatus: status.dc_sd_jwt_EuropeanDisabilityCard,
  });

  const statusListScenarios: Array<TestScenarioProp | undefined> = [
    pid && {
      title: "Get Status List (PID)",
      onPress: () =>
        dispatch(
          getCredentialStatusListThunk({
            format: pid.format,
            credential: pid.credential,
            credentialType: "PersonIdentificationData",
          })
        ),
      ...asyncStatus.PersonIdentificationData,
      icon: "fiscalCodeIndividual",
      isPresent: !!status.PersonIdentificationData,
    },
  ];

  const statusAssertionScenarios: Array<TestScenarioProp | undefined> = [
    pid && {
      title: "Get Status Assertion (PID)",
      onPress: () =>
        dispatch(
          getCredentialStatusAssertionThunk({
            credentialType: "PersonIdentificationData",
            format: pid.format,
            credential: pid.credential,
            keyTag: pid.keyTag,
          })
        ),
      ...asyncStatus.PersonIdentificationData,
      icon: "fiscalCodeIndividual",
      isPresent: !!status.PersonIdentificationData,
    },
    mDL && {
      title: "Get Status Assertion (MDL)",
      onPress: () =>
        dispatch(
          getCredentialStatusAssertionThunk({
            credentialType: "dc_sd_jwt_mDL",
            format: mDL.format,
            credential: mDL.credential,
            keyTag: mDL.keyTag,
          })
        ),
      ...asyncStatus.dc_sd_jwt_mDL,
      icon: "car",
      isPresent: !!status.dc_sd_jwt_mDL,
    },
    dc && {
      title: "Get Status Assertion (DC)",
      onPress: () =>
        dispatch(
          getCredentialStatusAssertionThunk({
            credentialType: "dc_sd_jwt_EuropeanDisabilityCard",
            format: dc.format,
            credential: dc.credential,
            keyTag: dc.keyTag,
          })
        ),
      ...asyncStatus.dc_sd_jwt_EuropeanDisabilityCard,
      icon: "accessibility",
      isPresent: !!status.dc_sd_jwt_EuropeanDisabilityCard,
    },
  ];

  const getScenarios = () => {
    if (wallet.CredentialStatus.statusList.isSupported) {
      return statusListScenarios;
    }
    if (wallet.CredentialStatus.statusAssertion.isSupported) {
      return statusAssertionScenarios;
    }
    return [];
  };

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={getScenarios()}
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
