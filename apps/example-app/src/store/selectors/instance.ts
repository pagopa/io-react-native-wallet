import type { RootState } from "../types";

export const selectInstanceAsyncStatus = (state: RootState) =>
  state.instance.asyncStatus;

export const selectInstanceRevocationAsyncStatus = (state: RootState) =>
  state.instance.revocationAsyncStatus;

export const selectInstanceKeyTag = (state: RootState) => state.instance.keyTag;

export const selectHasInstanceKeyTag = (state: RootState) =>
  selectInstanceKeyTag(state) !== undefined;
