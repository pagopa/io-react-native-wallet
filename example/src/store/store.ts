import { type Store, combineReducers, createStore } from "redux";
import { sessionReducer, type SessionState } from "./reducers/sesssion";
import { persistReducer, persistStore } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type GlobalState = {
  session: SessionState;
};

const rootReducer = combineReducers({
  session: sessionReducer,
});

const persistConfig = {
  key: "session",
  storage: AsyncStorage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store: Store = createStore(persistedReducer);

export const persistor = persistStore(store);
