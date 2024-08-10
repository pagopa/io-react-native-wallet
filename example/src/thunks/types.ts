import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import type { RootState } from "../store/types";

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  UnknownAction
>;
