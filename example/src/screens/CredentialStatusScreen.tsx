import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { IoWallet } from "@pagopa/io-react-native-wallet";
import compact from "lodash/compact";
import React, { useMemo } from "react";
import { FlatList } from "react-native";

import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectWalletUnitAttestation } from "../store/reducers/attestation";
import {
  selectCredential,
  selectStatusAsyncStatuses,
  selectStatuses,
} from "../store/reducers/credential";
import { selectItwVersion } from "../store/reducers/environment";
import { selectPid } from "../store/reducers/pid";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  getCredentialStatusAssertionThunk,
  getCredentialStatusListThunk,
} from "../thunks/credential";

/**
 * This screen is used to test the status functionalities for the credentials already obtained.
 */
export const CredentialStatusScreen = () => {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectStatuses);
  const asyncStatus = useAppSelector(selectStatusAsyncStatuses);
  const wua = useAppSelector(selectWalletUnitAttestation);

  const pid = useAppSelector(selectPid);
  const mDL = useAppSelector(selectCredential("dc_sd_jwt_mDL"));
  const dc = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanDisabilityCard"),
  );

  const itwVersion = useAppSelector(selectItwVersion);

  const wallet = useMemo(
    () => new IoWallet({ version: itwVersion }),
    [itwVersion],
  );

  useDebugInfo({
    dcStatus: status.dc_sd_jwt_EuropeanDisabilityCard,
    dcStatusState: asyncStatus.dc_sd_jwt_EuropeanDisabilityCard,
    mdlStatus: status.dc_sd_jwt_mDL,
    mdlStatusState: asyncStatus.dc_sd_jwt_mDL,
    pidStatus: status.PersonIdentificationData,
    pidStatusState: asyncStatus.PersonIdentificationData,
    wuaStatus: status.walletUnitAttestation,
    wuaStatusState: asyncStatus.walletUnitAttestation,
  });

  const statusListScenarios = compact<TestScenarioProp>([
    wua && {
      onPress: () =>
        dispatch(
          getCredentialStatusListThunk({
            credential: wua,
            credentialType: "walletUnitAttestation",
            format: "dc+sd-jwt",
          }),
        ),
      title: "Get Status List (WUA)",
      ...asyncStatus.walletUnitAttestation,
      icon: "locked",
      isPresent: !!status.walletUnitAttestation,
    },
    pid && {
      onPress: () =>
        dispatch(
          getCredentialStatusListThunk({
            credential: pid.credential,
            credentialType: "PersonIdentificationData",
            format: pid.format,
          }),
        ),
      title: "Get Status List (PID)",
      ...asyncStatus.PersonIdentificationData,
      icon: "fiscalCodeIndividual",
      isPresent: !!status.PersonIdentificationData,
    },
    mDL && {
      onPress: () =>
        dispatch(
          getCredentialStatusListThunk({
            credential: mDL.credential,
            credentialType: "dc_sd_jwt_mDL",
            format: mDL.format,
          }),
        ),
      title: "Get Status List (MDL)",
      ...asyncStatus.dc_sd_jwt_mDL,
      icon: "car",
      isPresent: !!status.dc_sd_jwt_mDL,
    },
    dc && {
      onPress: () =>
        dispatch(
          getCredentialStatusListThunk({
            credential: dc.credential,
            credentialType: "dc_sd_jwt_EuropeanDisabilityCard",
            format: dc.format,
          }),
        ),
      title: "Get Status List (DC)",
      ...asyncStatus.dc_sd_jwt_EuropeanDisabilityCard,
      icon: "accessibility",
      isPresent: !!status.dc_sd_jwt_EuropeanDisabilityCard,
    },
  ]);

  const statusAssertionScenarios = compact<TestScenarioProp>([
    pid && {
      onPress: () =>
        dispatch(
          getCredentialStatusAssertionThunk({
            credential: pid.credential,
            credentialType: "PersonIdentificationData",
            format: pid.format,
            keyTag: pid.keyTag,
          }),
        ),
      title: "Get Status Assertion (PID)",
      ...asyncStatus.PersonIdentificationData,
      icon: "fiscalCodeIndividual",
      isPresent: !!status.PersonIdentificationData,
    },
    mDL && {
      onPress: () =>
        dispatch(
          getCredentialStatusAssertionThunk({
            credential: mDL.credential,
            credentialType: "dc_sd_jwt_mDL",
            format: mDL.format,
            keyTag: mDL.keyTag,
          }),
        ),
      title: "Get Status Assertion (MDL)",
      ...asyncStatus.dc_sd_jwt_mDL,
      icon: "car",
      isPresent: !!status.dc_sd_jwt_mDL,
    },
    dc && {
      onPress: () =>
        dispatch(
          getCredentialStatusAssertionThunk({
            credential: dc.credential,
            credentialType: "dc_sd_jwt_EuropeanDisabilityCard",
            format: dc.format,
            keyTag: dc.keyTag,
          }),
        ),
      title: "Get Status Assertion (DC)",
      ...asyncStatus.dc_sd_jwt_EuropeanDisabilityCard,
      icon: "accessibility",
      isPresent: !!status.dc_sd_jwt_EuropeanDisabilityCard,
    },
  ]);

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
        </>
      )}
    />
  );
};
