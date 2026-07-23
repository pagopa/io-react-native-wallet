import { configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";

import { attestationReducer } from "./reducers/attestation";
import { credentialReducer } from "./reducers/credential";
import { credentialsCatalogueSlice } from "./reducers/credentialsCatalogue";
import { debugSlice } from "./reducers/debug";
import { environmentReducer } from "./reducers/environment";
import { instanceReducer } from "./reducers/instance";
import { mrtdReducer } from "./reducers/mrtd";
import { credentialOfferReducer } from "./reducers/offer";
import { pidReducer } from "./reducers/pid";
import { presentationReducer } from "./reducers/presentation";
import { sessionReducer } from "./reducers/session";
import { trustValidationReducer } from "./reducers/trustValidation";

/**
 * Redux store configuration.
 */
export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER], // Ignore all the action types dispatched by Redux Persist
      },
    }),
  reducer: {
    attestation: attestationReducer,
    credential: credentialReducer,
    credentialsCatalogue: credentialsCatalogueSlice.reducer,
    debug: debugSlice.reducer,
    environment: environmentReducer,
    instance: instanceReducer,
    mrtd: mrtdReducer,
    offer: credentialOfferReducer,
    pid: pidReducer,
    presentation: presentationReducer,
    session: sessionReducer,
    trustValidation: trustValidationReducer,
  },
});

/**
 * Redux persistor configuration used in the root component with {@link PersistGate}.
 */
export const persistor = persistStore(store);
