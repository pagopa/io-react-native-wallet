import type { RootState } from "../types";

export const selectPid = (state: RootState) => state.pid.pid;

export const selectPidAsyncStatus = (state: RootState) =>
  state.pid.pidAsyncStatus;
