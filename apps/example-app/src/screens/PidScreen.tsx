import { ContentWrapper, VSpacer } from "@pagopa/io-app-design-system";
import React from "react";

import TestScenario from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectPid, selectPidAsyncStatus } from "../store/selectors/pid";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getPidThunk } from "../thunks/pid";

/**
 * Screen to test the PID issuance.
 * The user authorization is performed by the PID provider in the system browser.
 */
export const PidScreen = () => {
  const dispatch = useAppDispatch();
  const pidState = useAppSelector(selectPidAsyncStatus);
  const pid = useAppSelector(selectPid);

  useDebugInfo({
    pid,
    pidState,
  });

  return (
    <ContentWrapper>
      <VSpacer />
      <TestScenario
        hasError={pidState.hasError}
        icon="fiscalCodeIndividual"
        isDone={pidState.isDone}
        isLoading={pidState.isLoading}
        isPresent={!!pid}
        onPress={() => dispatch(getPidThunk())}
        title="Get PID"
      />
    </ContentWrapper>
  );
};
