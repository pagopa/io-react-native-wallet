import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { FlatList } from "react-native";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useCie } from "../hooks/useCie";
import { useCieID } from "../hooks/useCieId";
import { useDebugInfo } from "../hooks/useDebugInfo";
import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import { selectEnv } from "../store/reducers/environment";
import { selectPid, selectPidAsyncStatus } from "../store/reducers/pid";
import { useAppSelector } from "../store/utils";
import { getCieIdpHint } from "../utils/environment";

type ScreenProps = NativeStackScreenProps<MainStackNavParamList, "Pid">;

/**
 * Component (screen in a future PR) to test the PID functionalities.
 * This include getting the PID from SPID and CIE, both with CieID and CieID+PIN.
 * Based on the env variabiles this screen will use the UAT or PROD environment of the identity provider.
 * @returns
 */
export const PidScreen = ({ navigation }: ScreenProps) => {
  const pidSpidState = useAppSelector(selectPidAsyncStatus("spid"));
  const pidCieL2State = useAppSelector(selectPidAsyncStatus("cieL2"));
  const pidCieL3State = useAppSelector(selectPidAsyncStatus("cieL3"));
  const pidSpidL2PlusState = useAppSelector(selectPidAsyncStatus("spidL2Plus"));
  const pidCieL2PlusState = useAppSelector(selectPidAsyncStatus("cieL2Plus"));
  const pid = useAppSelector(selectPid);
  const env = useAppSelector(selectEnv);
  const cieIdpHint = getCieIdpHint(env);
  const cie = useCie(cieIdpHint);
  const cieID = useCieID(cieIdpHint);

  const isEnvPre = env === "pre";

  useDebugInfo({
    pidSpidState,
    pidCieL2State,
    pidCieL3State,
    pidSpidL2PlusState,
    pidCieL2PlusState,
    pid,
  });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        onPress: () =>
          navigation.navigate("PidSpidIdpSelection", { authMethod: "spid" }),
        title: "Get PID (SPID)",
        isLoading: pidSpidState.isLoading,
        hasError: pidSpidState.hasError,
        isDone: pidSpidState.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
      {
        title: "Get PID (CieID)",
        onPress: () => cieID.startCieIDIdentification("cieL2"),
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
      {
        onPress: () =>
          navigation.navigate("PidSpidIdpSelection", {
            authMethod: "spidL2Plus",
          }),
        title: "Get PID (SPID + CIE)",
        isLoading: pidSpidL2PlusState.isLoading,
        hasError: pidSpidL2PlusState.hasError,
        isDone: pidSpidL2PlusState.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
      {
        title: "Get PID (CieID + CIE)",
        onPress: () => cieID.startCieIDIdentification("cieL2Plus"),
        isLoading: pidCieL2PlusState.isLoading,
        hasError: pidCieL2PlusState.hasError,
        isDone: pidCieL2PlusState.isDone,
        isPresent: !!pid,
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
      pidSpidL2PlusState.isLoading,
      pidSpidL2PlusState.hasError,
      pidSpidL2PlusState.isDone,
      pidCieL2PlusState.isLoading,
      pidCieL2PlusState.hasError,
      pidCieL2PlusState.isDone,
      pid,
      isEnvPre,
      cieIdpHint,
      navigation,
      cie,
      cieID,
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
