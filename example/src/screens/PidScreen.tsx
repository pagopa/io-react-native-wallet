import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { FlatList } from "react-native";
import { useCie } from "../components/cie";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import { selectEnv } from "../store/reducers/environment";
import { selectPid, selectPidAsyncStatus } from "../store/reducers/pid";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getPidCieIDThunk } from "../thunks/pidCieID";
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
  const pid = useAppSelector(selectPid);
  const env = useAppSelector(selectEnv);
  const cieIdpHint = getCieIdpHint(env);
  const cie = useCie(cieIdpHint);
  const isEnvPre = env === "pre";

  useDebugInfo({
    pidSpidState,
    pidCieL2State,
    pidCieL3State,
    pid,
  });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        onPress: () => navigation.navigate("PidSpidIdpSelection"),
        title: "Get PID (SPID)",
        isLoading: pidSpidState.isLoading,
        hasError: pidSpidState.hasError,
        isDone: pidSpidState.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
      {
        title: "Get PID (CIE L2)",
        onPress: () =>
          dispatch(
            getPidCieIDThunk({
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
        title: "Get PID (CIE+PIN)",
        onPress: () => cie.startCieIdentification(),
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
      cie,
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
      {cie.components}
    </>
  );
};
