import React from "react";
import { useAppDispatch, useAppSelector } from "../store/utilts";
import TestScenario from "../components/TestScenario";
import { selectHasInstanceKeyTag } from "../store/reducers/instance";
import { getCredentialThunk } from "../thunks/credential";
import { SPID_IDPHINT } from "@env";
import { selectCredentialState } from "../store/reducers/credential";
import TestCieL3Scenario from "../components/TestCieL3Scenario";
import { CIE_PROD_IDPHINT, CIE_UAT_IDPHINT, isCieUat } from "../utils/env";

/**
 * Component (screen in a future PR) to test the PID functionalities.
 * This include getting the PID from SPID and CIE, both with CieID and CieID+PIN.
 * Based on the env variabiles this screen will use the UAT or PROD environment of the identity provider.
 * @returns
 */
export const PidScreen = () => {
  const dispatch = useAppDispatch();

  const pidState = useAppSelector(
    selectCredentialState("PersonIdentificationData")
  );

  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);

  return (
    <>
      {hasIntegrityKeyTag ? ( // We need the integrity key to get the PID as this indicates the presence of a wallet instance
        <>
          <TestScenario
            onPress={() =>
              dispatch(
                getCredentialThunk({
                  credentialType: "PersonIdentificationData",
                  idpHint: SPID_IDPHINT,
                })
              )
            }
            title="Get PID (SPID)"
            isLoading={pidState.isLoading}
            hasError={pidState.hasError}
            isDone={pidState.isDone}
          />
          <TestScenario
            title="Get PID (CIE DEMO)"
            onPress={() =>
              dispatch(
                getCredentialThunk({
                  credentialType: "PersonIdentificationData",
                  idpHint: isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT,
                })
              )
            }
            isLoading={pidState.isLoading}
            hasError={pidState.hasError}
            isDone={pidState.isDone}
          />
          <TestCieL3Scenario
            title="Get PID (CIE+PIN)"
            isCieUat={isCieUat}
            idpHint={isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT}
            isDisabled={!hasIntegrityKeyTag}
            isLoading={pidState.isLoading}
            hasError={pidState.hasError}
            isDone={pidState.isDone}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
};
