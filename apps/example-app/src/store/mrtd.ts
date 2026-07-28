import type { RootState } from "./types";

export const selectMrtdAsyncStatus = (state: RootState) =>
  state.mrtd.asyncStatus;

export const selectMrtdFlowParams = (state: RootState) => state.mrtd.flowParams;

export const selectMrtdChallenge = (state: RootState) =>
  state.mrtd.flowParams?.challenge;

export const selectMrtdChallengeCallbackUrl = (state: RootState) =>
  state.mrtd.validation?.callbackUrl;
