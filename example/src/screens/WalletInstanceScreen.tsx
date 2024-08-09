import React from "react";
import { useAppDispatch } from "../store/dispatch";
import { createWalletInstanceThunk } from "../thunks/create-wallet-instance";
import { useAppSelector } from "../store/utilts";
import TestScenario from "../scenarios/component/TestScenario";
import {
  selectHasInstanceKeyTag,
  selectInstanceState,
} from "../store/reducers/instance";
import { selectAttestationState } from "../store/reducers/attestation";
import { getAttestationThunk } from "../thunks/get-attestation";

export const WalletInstanceScreen = () => {
  const dispatch = useAppDispatch();

  const {
    isLoading: isLoadingInst,
    hasError: hasErrorInst,
    isDone: isDoneInst,
  } = useAppSelector(selectInstanceState);

  const {
    isLoading: isLoadingAtt,
    hasError: hasErrorAtt,
    isDone: isDoneAtt,
  } = useAppSelector(selectAttestationState);

  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);

  return (
    <>
      <TestScenario
        onPress={() => dispatch(createWalletInstanceThunk())}
        title="Create Wallet Instance"
        isLoading={isLoadingInst}
        hasError={hasErrorInst}
        isDone={isDoneInst}
      />
      <TestScenario
        onPress={() => dispatch(getAttestationThunk())}
        title="Get asdasd Attestation"
        isLoading={isLoadingAtt}
        hasError={hasErrorAtt}
        isDone={isDoneAtt}
        isDisabled={!hasIntegrityKeyTag}
      />
    </>
  );
};
