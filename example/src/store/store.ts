import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer } from "./reducers/session";
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
import { presentationReducer } from "./reducers/presentation";
import { trustValidationReducer } from "./reducers/trustValidation";
import { mrtdReducer } from "./reducers/mrtd";
import { credentialOfferReducer } from "./reducers/offer";
import { credentialsCatalogueSlice } from "./reducers/credentialsCatalogue";

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
    mrtd: mrtdReducer,
    presentation: presentationReducer,
    trustValidation: trustValidationReducer,
    offer: credentialOfferReducer,
    credentialsCatalogue: credentialsCatalogueSlice.reducer,
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
