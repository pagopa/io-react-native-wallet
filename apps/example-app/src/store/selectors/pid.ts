import type { PidAuthMethods, RootState } from "../types";

export const selectPid = (state: RootState) => state.pid.pid;

export const selectPidAsyncStatus =
  (authMethod: PidAuthMethods) => (state: RootState) =>
    state.pid.pidAsyncStatus[authMethod];

export const selectPidFlowParams = (state: RootState) =>
  state.pid.pidFlowParams;
