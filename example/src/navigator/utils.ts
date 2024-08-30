import type { MainStackNavParamList } from "./MainStackNavigator";

declare global {
  namespace ReactNavigation {
    interface RootParamList extends MainStackNavParamList {}
  }
}
