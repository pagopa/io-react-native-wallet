import React from "react";
import { useAppDispatch, useAppSelector } from "../store/utilts";
import { selectHasInstanceKeyTag } from "../store/reducers/instance";
import {
  selectCredential,
  selectCredentialState,
} from "../store/reducers/credential";
import { getCredentialThunk } from "../thunks/credential";
import TestScenario from "../components/TestScenario";

/**
 * Component (screen in a future PR) to test the credential functionalities.
 * This includes issuing a credential and getting its status attestation.
 */
export const CredentialScreen = () => {
  const dispatch = useAppDispatch();

  const pid = useAppSelector(selectCredential("PersonIdentificationData"));

  const mdlState = useAppSelector(selectCredentialState("MDL"));

  const dcState = useAppSelector(
    selectCredentialState("EuropeanDisabilityCard")
  );

  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);

  return (
    <>
      {hasIntegrityKeyTag && pid ? ( // We need the integrity key and the PID to issue a credential
        <>
          <TestScenario
            title="Get credential (MDL)"
            onPress={() =>
              dispatch(getCredentialThunk({ credentialType: "MDL" }))
            }
            isDone={mdlState.isDone}
            isLoading={mdlState.isLoading}
            hasError={mdlState.hasError}
          />
          <TestScenario
            title="Get credential (DC)"
            onPress={() =>
              dispatch(
                getCredentialThunk({ credentialType: "EuropeanDisabilityCard" })
              )
            }
            isDone={dcState.isDone}
            isLoading={dcState.isLoading}
            hasError={dcState.hasError}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
};
