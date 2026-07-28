import { createAction } from "@reduxjs/toolkit";

import type { RootState } from "./types";

export const instanceReset = createAction("instance/instanceReset");

export const selectInstanceAsyncStatus = (state: RootState) =>
  state.instance.asyncStatus;

export const selectInstanceRevocationAsyncStatus = (state: RootState) =>
  state.instance.revocationAsyncStatus;

export const selectInstanceKeyTag = (state: RootState) => state.instance.keyTag;

export const selectHasInstanceKeyTag = (state: RootState) =>
  selectInstanceKeyTag(state) !== undefined;
