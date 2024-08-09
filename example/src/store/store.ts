import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer } from "./reducers/sesssion";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";
import { instanceReducer } from "./reducers/instance";
import { attestationSlice } from "./reducers/attestation";
import { credentialReducer } from "./reducers/credential";

/**
 * Redux store configuration.
 */
export const store = configureStore({
  reducer: {
    session: sessionReducer,
    instance: instanceReducer,
    attestation: attestationSlice.reducer,
    credential: credentialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER], // Ignore all the action types dispatched by Redux Persist
      },
    }),
});

/**
 * Redux persistor configuration used in the root component with {@link PersistGate}.
 */
export const persistor = persistStore(store);

/**
 * Type definition for the root state of the Redux store.
 */
export type RootState = ReturnType<typeof store.getState>;
