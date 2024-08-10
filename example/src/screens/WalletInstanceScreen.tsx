import React from "react";
import { createWalletInstanceThunk } from "../thunks/instance";
import { useAppDispatch, useAppSelector } from "../store/utilts";
import TestScenario from "../components/TestScenario";
import {
  selectHasInstanceKeyTag,
  selectInstanceState,
} from "../store/reducers/instance";
import { selectAttestationState } from "../store/reducers/attestation";
import { getAttestationThunk } from "../thunks/attestation";

/**
 * Component (screen in a future PR) to test the wallet instance functionalities.
 * This includes creating a wallet instance and getting an attestation.
 */
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
        title="Get Attestation"
        isLoading={attestationState.isLoading}
        hasError={attestationState.hasError}
        isDone={attestationState.isDone}
        isDisabled={!hasIntegrityKeyTag}
      />
    </>
  );
};
