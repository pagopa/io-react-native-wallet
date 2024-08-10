import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "../store/types";

/**
 * Creates an async thunk with the correct types for the store and the dispatch function
 * which would otherwise be wrongly inferred.
 */
export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: unknown;
}>();
