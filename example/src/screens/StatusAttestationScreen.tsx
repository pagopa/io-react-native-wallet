import React from "react";
import { useAppDispatch, useAppSelector } from "../store/utilts";
import {
  selectCredential,
  selectStatusAttestationState,
} from "../store/reducers/credential";
import { getCredentialStatusAttestationThunk } from "../thunks/credential";
import TestScenario from "../components/TestScenario";

export const StatusAttestationScreen = () => {
  const dispatch = useAppDispatch();

  const mDl = useAppSelector(selectCredential("MDL"));

  const mdlStatAttState = useAppSelector(selectStatusAttestationState("MDL"));

  return (
    <>
      {mDl ? (
        <>
          <TestScenario
            title="Get Status Attestation (MDL)"
            onPress={() =>
              dispatch(
                getCredentialStatusAttestationThunk({
                  credentialType: "MDL",
                  credential: mDl.credential,
                  keyTag: mDl.keyTag,
                })
              )
            }
            isDone={mdlStatAttState.isDone}
            isLoading={mdlStatAttState.isLoading}
            hasError={mdlStatAttState.hasError}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
};
