import { getType } from "typesafe-actions";

import type { Actions } from "../actions/type";
import { sessionReset, sessionSet } from "../actions/session";
import type { GlobalState } from "../store";

export type SessionState = {
  ioAuthToken: string | undefined;
};

const initialState: SessionState = {
  ioAuthToken: undefined,
};

export const sessionReducer = (
  state: SessionState = initialState,
  action: Actions
): SessionState => {
  switch (action.type) {
    case getType(sessionSet):
      return {
        ...state,
        ioAuthToken: action.payload,
      };
    case getType(sessionReset):
      return initialState;
    default:
      return initialState;
  }
};

export const selectIoAuthToken = (state: GlobalState) =>
  state.session.ioAuthToken;
