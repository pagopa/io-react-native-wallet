import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import type { RootState } from "../store/types";

/**
 * Type definition for a correctly typed Redux Thunk.
 */
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  UnknownAction
>;
