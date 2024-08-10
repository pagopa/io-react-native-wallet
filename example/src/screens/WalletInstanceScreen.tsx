import React from "react";
import { useAppDispatch } from "../store/dispatch";
import { createWalletInstanceThunk } from "../thunks/instance";
import { useAppSelector } from "../store/utilts";
import TestScenario from "../components/TestScenario";
import {
  selectHasInstanceKeyTag,
  selectInstanceState,
} from "../store/reducers/instance";
import { selectAttestationState } from "../store/reducers/attestation";
import { getAttestationThunk } from "../thunks/attestation";

export const WalletInstanceScreen = () => {
  const dispatch = useAppDispatch();

  const instanceState = useAppSelector(selectInstanceState);

  const attestationState = useAppSelector(selectAttestationState);

  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);

  return (
    <>
      <TestScenario
        onPress={() => dispatch(createWalletInstanceThunk())}
        title="Create Wallet Instance"
        isLoading={instanceState.isLoading}
        hasError={instanceState.hasError}
        isDone={instanceState.isDone}
      />
      <TestScenario
        onPress={() => dispatch(getAttestationThunk())}
        title="Get asdasd Attestation"
        isLoading={attestationState.isLoading}
        hasError={attestationState.hasError}
        isDone={attestationState.isDone}
        isDisabled={!hasIntegrityKeyTag}
      />
    </>
  );
};
