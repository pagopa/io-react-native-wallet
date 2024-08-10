import React from "react";
import { useAppDispatch, useAppSelector } from "../store/utilts";
import { selectHasInstanceKeyTag } from "../store/reducers/instance";
import {
  selectCredential,
  selectCredentialState,
  selectStatusAttestationState,
} from "../store/reducers/credential";
import {
  getCredentialStatusAttestationThunk,
  getCredentialThunk,
} from "../thunks/credential";
import TestScenario from "../components/TestScenario";

export const CredentialScreen = () => {
  const dispatch = useAppDispatch();

  const pid = useAppSelector(selectCredential("PersonIdentificationData"));

  const mdl = useAppSelector(selectCredential("MDL"));
  const mdlState = useAppSelector(selectCredentialState("MDL"));
  const mdlStaAttState = useAppSelector(selectStatusAttestationState("MDL"));

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
          {mdl ? (
            <TestScenario
              title="Get credential (mDL) Status Attestation"
              onPress={() =>
                dispatch(
                  getCredentialStatusAttestationThunk({
                    credential: mdl.credential,
                    keyTag: mdl.keyTag,
                    credentialType: "MDL",
                  })
                )
              }
              hasError={mdlStaAttState.hasError}
              isDone={mdlStaAttState.isDone}
              isLoading={mdlStaAttState.isLoading}
            />
          ) : null}
        </>
      ) : (
        <></>
      )}
    </>
  );
};
