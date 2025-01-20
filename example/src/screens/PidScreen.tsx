import React, { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/utils";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { FlatList } from "react-native";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectPid, selectPidAsyncStatus } from "../store/reducers/pid";
import { getPidThunk } from "../thunks/pid";
import { SPID_DEMO_IDPHINT } from "../utils/environment";

/**
 * Component (screen in a future PR) to test the PID functionalities.
 * This include getting the PID from SPID and CIE, both with CieID and CieID+PIN.
 * Based on the env variabiles this screen will use the UAT or PROD environment of the identity provider.
 * @returns
 */
export const PidScreen = () => {
  const dispatch = useAppDispatch();
  const pidState = useAppSelector(selectPidAsyncStatus);
  const pid = useAppSelector(selectPid);

  useDebugInfo({
    pidState,
    pid,
  });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        isCieL3: false,
        onPress: () =>
          dispatch(
            getPidThunk({
              credentialType: "urn:eu.europa.ec.eudi:pid:1",
              idpHint: SPID_DEMO_IDPHINT,
            })
          ),
        title: "Get PID (SPID)",
        isLoading: pidState.isLoading,
        hasError: pidState.hasError,
        isDone: pidState.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
    ],
    [dispatch, pid, pidState.hasError, pidState.isDone, pidState.isLoading]
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
    </>
  );
};
