import { createAction, type ActionType } from "typesafe-actions";

export const sessionSet = createAction("SESSION_SET")<string>();

export const sessionReset = createAction("SESSION_RESET")();

export type SessionActions =
  | ActionType<typeof sessionSet>
  | ActionType<typeof sessionReset>;
