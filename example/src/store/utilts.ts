import { useSelector } from "react-redux";
import type { RootState } from "./store";
import type { SerializedError } from "@reduxjs/toolkit";

export const useAppSelector = useSelector.withTypes<RootState>();

export type WithAsyncState = {
  isDone: boolean;
  isLoading: boolean;
  hasError:
    | { status: false; error: undefined }
    | { status: true; error: SerializedError };
};

export const withAsyncStateInitial: WithAsyncState = {
  isDone: false,
  isLoading: false,
  hasError: { status: false, error: undefined },
};

export type SupportedCredentials =
  | "PersonIdentificationData"
  | "MDL"
  | "EuropeanDisabilityCard";
