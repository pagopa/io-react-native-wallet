import React, { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/utils";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import TestCieL3Scenario, {
  type TestCieL3ScenarioProps,
} from "../components/TestCieL3Scenario";
import { FlatList } from "react-native";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { getCieIdpHint } from "../utils/environment";
import { selectEnv } from "../store/reducers/environment";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import { selectPid, selectPidAsyncStatus } from "../store/reducers/pid";
import { getPidThunk } from "../thunks/pid";

type MixedTestScenarioProp =
  | (TestScenarioProp & { isCieL3: false })
  | (TestCieL3ScenarioProps & { isCieL3: true });

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
  const pid = useAppSelector(selectPid);
  const env = useAppSelector(selectEnv);
  const cieIdpHint = getCieIdpHint(env);
  const isEnvPre = env === "pre";

  useDebugInfo({
    pidSpidState,
    pidCieL2State,
    pidCieL3State,
    pid,
  });

  const scenarios: Array<MixedTestScenarioProp> = useMemo(
    () => [
      {
        isCieL3: false,
        onPress: () => navigation.navigate("PidSpidLogin"),
        title: "Get PID (SPID)",
        isLoading: pidSpidState.isLoading,
        hasError: pidSpidState.hasError,
        isDone: pidSpidState.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
      {
        isCieL3: false,
        title: "Get PID (CIE L2)",
        onPress: () =>
          dispatch(
            getPidThunk({
              credentialType: "PersonIdentificationData",
              idpHint: cieIdpHint,
              authMethod: "cieL2",
            })
          ),
        isLoading: pidCieL2State.isLoading,
        hasError: pidCieL2State.hasError,
        isDone: pidCieL2State.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
      {
        isCieL3: true,
        title: "Get PID (CIE L3)",
        isCieUat: isEnvPre,
        idpHint: cieIdpHint,
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
      pid,
      pidCieL2State.isLoading,
      pidCieL2State.hasError,
      pidCieL2State.isDone,
      isEnvPre,
      cieIdpHint,
      pidCieL3State.isLoading,
      pidCieL3State.hasError,
      pidCieL3State.isDone,
      navigation,
      dispatch,
    ]
  );

  return (
    <>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={scenarios}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        renderItem={({ item }) => (
          <>
            {item.isCieL3 === true ? (
              <TestCieL3Scenario
                title="Get PID (CIE+PIN)"
                isCieUat={isEnvPre}
                idpHint={cieIdpHint}
                isPresent={!!pid}
                isLoading={pidCieL3State.isLoading}
                hasError={pidCieL3State.hasError}
                isDone={pidCieL3State.isDone}
                icon="fiscalCodeIndividual"
              />
            ) : (
              <TestScenario
                onPress={item.onPress}
                title={item.title}
                isLoading={item.isLoading}
                hasError={item.hasError}
                isDone={item.isDone}
                icon={item.icon}
                isPresent={item.isPresent}
              />
            )}
            <VSpacer />
          </>
        )}
      />
    </>
  );
};
