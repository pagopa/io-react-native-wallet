import React from "react";
import { useAppDispatch } from "../store/dispatch";
import { useAppSelector } from "../store/utilts";
import TestScenario from "../scenarios/component/TestScenario";
import { selectHasInstanceKeyTag } from "../store/reducers/instance";
import {
  selectCredential,
  selectCredentialState,
} from "../store/reducers/credential";
import { getCredentialThunk } from "../thunks/get-credential";

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
      {hasIntegrityKeyTag && pid ? (
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
          {/* <TestScenario
            title="Get credential (mDL) Status Attestation"
            scenario={scenarios.getCredentialStatusAttestation(mdlContext!)}
            disabled={!integrityContext || !pidContext || !mdlContext}
          /> */}
        </>
      ) : (
        <></>
      )}
    </>
  );
};
