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
import { attestationReducer } from "./reducers/attestation";
import { credentialReducer } from "./reducers/credential";
import { debugSlice } from "./reducers/debug";
import { environmentReducer } from "./reducers/environment";
import { pidReducer } from "./reducers/pid";
import { trustmarkReducer } from "./reducers/trustmark";

/**
 * Redux store configuration.
 */
export const store = configureStore({
  reducer: {
    environment: environmentReducer,
    debug: debugSlice.reducer,
    session: sessionReducer,
    instance: instanceReducer,
    attestation: attestationReducer,
    credential: credentialReducer,
    pid: pidReducer,
    trustmark: trustmarkReducer,
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
