import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  ContentWrapper,
  ListItemSwitch,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList } from "react-native";

import type { MainStackNavParamList } from "../navigator/MainStackNavigator";

import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectEnv } from "../store/reducers/environment";
import { selectMrtdChallenge } from "../store/reducers/mrtd";
import {
  selectPid,
  selectPidAsyncStatus,
  selectPidFlowParams,
} from "../store/reducers/pid";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { preparePidFlowParamsThunk } from "../thunks/pid";
import { getCieIdpHint } from "../utils/environment";

type ScreenProps = NativeStackScreenProps<MainStackNavParamList, "Pid">;

/**
 * Component (screen in a future PR) to test the PID functionalities.
 * This include getting the PID from SPID and CIE, both with CieID and CieID+PIN.
 * Based on the env variabiles this screen will use the UAT or PROD environment of the identity provider.
 * @returns
 */
export const PidScreen = ({ navigation }: ScreenProps) => {
  const dispatch = useAppDispatch();
  const pidSpidState = useAppSelector(selectPidAsyncStatus("spid"));
  const pidCieL2State = useAppSelector(selectPidAsyncStatus("cieL2"));
  const pidCieL3State = useAppSelector(selectPidAsyncStatus("cieL3"));
  const challenge = useAppSelector(selectMrtdChallenge);
  const pid = useAppSelector(selectPid);
  const pidFlowParams = useAppSelector(selectPidFlowParams);
  const env = useAppSelector(selectEnv);

  const [withDocumentProof, setWithDocumentProof] = useState(true);

  useDebugInfo({
    challenge,
    pid,
    pidCieL2State,
    pidCieL3State,
    pidSpidState,
  });

  const isLoading = useMemo(
    () =>
      pidSpidState.isLoading ||
      pidCieL2State.isLoading ||
      pidCieL3State.isLoading,
    [pidSpidState.isLoading, pidCieL2State.isLoading, pidCieL3State.isLoading],
  );

  useEffect(() => {
    if (challenge && pidFlowParams) {
      const { redirectUri } = pidFlowParams;
      navigation.navigate("CieInternalAuthentication", {
        challenge,
        redirectUri,
      });
    }
  }, [navigation, challenge, pidFlowParams]);

  const handleCieIdIdentification = useCallback(async () => {
    const { authUrl, redirectUri } = await dispatch(
      preparePidFlowParamsThunk({
        authMethod: "cieL2",
        idpHint: getCieIdpHint(env),
        withMRTDPoP: withDocumentProof,
      }),
    ).unwrap();

    navigation.navigate("CieIdAuthentication", {
      authUrl,
      redirectUri,
      withDocumentProof,
    });
  }, [dispatch, env, navigation, withDocumentProof]);

  const scenarios: TestScenarioProp[] = useMemo(
    () => [
      {
        hasError: pidSpidState.hasError,
        icon: "fiscalCodeIndividual",
        isDone: pidSpidState.isDone,
        isLoading: pidSpidState.isLoading,
        isPresent: !!pid,
        onPress: () =>
          navigation.navigate("PidSpidIdpSelection", {
            withDocumentProof,
          }),
        title: `Get PID (SPID${withDocumentProof ? " + CIE" : ""})`,
      },
      {
        hasError: pidCieL2State.hasError,
        icon: "fiscalCodeIndividual",
        isDone: pidCieL2State.isDone,
        isLoading: pidCieL2State.isLoading,
        isPresent: !!pid,
        onPress: handleCieIdIdentification,
        title: `Get PID (CieID${withDocumentProof ? " + CIE" : ""})`,
      },
      {
        hasError: pidCieL3State.hasError,
        icon: "fiscalCodeIndividual",
        idpHint: getCieIdpHint(env),
        isCieUat: env === "pre",
        isDone: pidCieL3State.isDone,
        isLoading: pidCieL3State.isLoading,
        isPresent: !!pid,
        onPress: () => navigation.navigate("CieAuthentication"),
        title: "Get PID (CIE+PIN)",
      },
    ],
    [
      handleCieIdIdentification,
      pidSpidState.isLoading,
      pidSpidState.hasError,
      pidSpidState.isDone,
      pidCieL2State.isLoading,
      pidCieL2State.hasError,
      pidCieL2State.isDone,
      pidCieL3State.isLoading,
      pidCieL3State.hasError,
      pidCieL3State.isDone,
      pid,
      env,
      navigation,
      withDocumentProof,
    ],
  );

  return (
    <ContentWrapper>
      <VSpacer />
      <ListItemSwitch
        disabled={isLoading}
        label="Use document proof"
        onSwitchValueChange={setWithDocumentProof}
        value={withDocumentProof}
      />
      <VSpacer />
      <FlatList
        data={scenarios}
        keyExtractor={(item, index) => `${item.title}-${index}`}
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
    </ContentWrapper>
  );
};
