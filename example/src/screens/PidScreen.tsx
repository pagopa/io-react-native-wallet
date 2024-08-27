import React, { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/utils";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { getCredentialThunk } from "../thunks/credential";
import { SPID_IDPHINT } from "@env";
import {
  selectCredential,
  selectCredentialAsyncStatus,
} from "../store/reducers/credential";
import TestCieL3Scenario, {
  type TestCieL3ScenarioProps,
} from "../components/TestCieL3Scenario";
import { CIE_PROD_IDPHINT, CIE_UAT_IDPHINT, isCieUat } from "../utils/env";
import { FlatList } from "react-native";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useDebugInfo } from "../hooks/useDebugInfo";

type MixedTestScenarioProp =
  | (TestScenarioProp & { isCieL3: false })
  | (TestCieL3ScenarioProps & { isCieL3: true });

/**
 * Component (screen in a future PR) to test the PID functionalities.
 * This include getting the PID from SPID and CIE, both with CieID and CieID+PIN.
 * Based on the env variabiles this screen will use the UAT or PROD environment of the identity provider.
 * @returns
 */
export const PidScreen = () => {
  const dispatch = useAppDispatch();

  const pidState = useAppSelector(
    selectCredentialAsyncStatus("PersonIdentificationData")
  );

  const pid = useAppSelector(selectCredential("PersonIdentificationData"));

  useDebugInfo({
    pidState,
    pid,
  });

  const scenarios: Array<MixedTestScenarioProp> = useMemo(
    () => [
      {
        isCieL3: false,
        onPress: () =>
          dispatch(
            getCredentialThunk({
              credentialType: "PersonIdentificationData",
              idpHint: SPID_IDPHINT,
            })
          ),
        title: "Get PID (SPID)",
        isLoading: pidState.isLoading,
        hasError: pidState.hasError,
        isDone: pidState.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
      {
        isCieL3: false,
        title: "Get PID (CIE DEMO)",
        onPress: () =>
          dispatch(
            getCredentialThunk({
              credentialType: "PersonIdentificationData",
              idpHint: isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT,
            })
          ),
        isLoading: pidState.isLoading,
        hasError: pidState.hasError,
        isDone: pidState.isDone,
        isPresent: !!pid,
        icon: "fiscalCodeIndividual",
      },
      {
        isCieL3: true,
        title: "Get PID (CIE+PIN)",
        isCieUat,
        idpHint: isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT,
        isPresent: !!pid,
        isLoading: pidState.isLoading,
        hasError: pidState.hasError,
        isDone: pidState.isDone,
        icon: "fiscalCodeIndividual",
      },
    ],
    [pidState.isLoading, pidState.hasError, pidState.isDone, pid, dispatch]
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
                isCieUat={isCieUat}
                idpHint={isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT}
                isPresent={!!pid}
                isLoading={pidState.isLoading}
                hasError={pidState.hasError}
                isDone={pidState.isDone}
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
