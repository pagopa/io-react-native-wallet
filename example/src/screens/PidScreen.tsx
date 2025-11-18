import {
  ContentWrapper,
  ListItemSwitch,
  VSpacer,
} from "@pagopa/io-app-design-system";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList } from "react-native";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import { selectEnv } from "../store/reducers/environment";
import { selectMrtdChallenge } from "../store/reducers/mrtd";
import {
  selectPid,
  selectPidAsyncStatus,
  selectPidFlowParams,
} from "../store/reducers/pid";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { continuePidFlowThunk, preparePidFlowParamsThunk } from "../thunks/pid";
import { getCieIdpHint } from "../utils/environment";
import { openUrlAndListenForAuthRedirect } from "../utils/openUrlAndListenForRedirect";

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
    pidSpidState,
    pidCieL2State,
    pidCieL3State,
    challenge,
    pid,
  });

  const isLoading = useMemo(
    () =>
      pidSpidState.isLoading ||
      pidCieL2State.isLoading ||
      pidCieL3State.isLoading,
    [pidSpidState.isLoading, pidCieL2State.isLoading, pidCieL3State.isLoading]
  );

  useEffect(() => {
    if (challenge && pidFlowParams) {
      const { redirectUri } = pidFlowParams;
      navigation.navigate("CieInternalAuthentication", {
        redirectUri,
        challenge,
      });
    }
  }, [navigation, challenge, pidFlowParams]);

  const startCieIDIdentification = useCallback(async () => {
    const { authUrl, redirectUri } = await dispatch(
      preparePidFlowParamsThunk({
        idpHint: getCieIdpHint(env),
        authMethod: "cieL2",
        withMRTDPoP: withDocumentProof,
      })
    ).unwrap();

    const { authRedirectUrl } = await openUrlAndListenForAuthRedirect(
      redirectUri,
      authUrl
    );

    dispatch(
      continuePidFlowThunk({
        authRedirectUrl,
      })
    );
  }, [dispatch, withDocumentProof, env]);

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        onPress: () =>
          navigation.navigate("PidSpidIdpSelection", {
            withDocumentProof,
          }),
        title: `Get PID (SPID${withDocumentProof ? " + CIE" : ""})`,
        isLoading: pidSpidState.isLoading,
        hasError: pidSpidState.hasError,
        isDone: pidSpidState.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
      {
        title: `Get PID (CieID${withDocumentProof ? " + CIE" : ""})`,
        onPress: () => startCieIDIdentification(),
        isLoading: pidCieL2State.isLoading,
        hasError: pidCieL2State.hasError,
        isDone: pidCieL2State.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
      {
        title: "Get PID (CIE+PIN)",
        onPress: () => navigation.navigate("CieAuthentication"),
        isCieUat: env === "pre",
        idpHint: getCieIdpHint(env),
        isPresent: !!pid,
        isLoading: pidCieL3State.isLoading,
        hasError: pidCieL3State.hasError,
        isDone: pidCieL3State.isDone,
        icon: "fiscalCodeIndividual",
      },
    ],
    [
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
      startCieIDIdentification,
    ]
  );

  return (
    <ContentWrapper>
      <VSpacer />
      <ListItemSwitch
        label="Use document proof"
        disabled={isLoading}
        value={withDocumentProof}
        onSwitchValueChange={setWithDocumentProof}
      />
      <VSpacer />
      <FlatList
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
    </ContentWrapper>
  );
};
