import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState, AsyncStatus } from "./types";

/**
 * Hook to use the Redux selector function with the correct type.
 */
export const useAppSelector = useSelector.withTypes<RootState>();

/**
 * Hook to use the Redux dispatch function with the correct type.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Standard initial state for async operations. To be used with stores that handle async operations and have a state which cincludes {@link AsyncStatus}.
 */
export const asyncStatusInitial: AsyncStatus = {
  isDone: false,
  isLoading: false,
  hasError: { status: false, error: undefined },
};
