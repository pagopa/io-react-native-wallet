import { IconButton, IOThemeLight } from "@pagopa/io-app-design-system";
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useCallback, useEffect } from "react";

import { HeaderTitle } from "../components/HeaderTitle";
import { CredentialsCatalogueScreen } from "../screens/CredentialsCatalogue";
import { CredentialScreen } from "../screens/CredentialScreen";
import { CredentialStatusScreen } from "../screens/CredentialStatusScreen";
import HomeScreen from "../screens/HomeScreen";
import { OfferScreen } from "../screens/OfferScreen";
import { PidScreen } from "../screens/PidScreen";
import { PresentationScreen } from "../screens/PresentationScreen";
import { ProximityScreen } from "../screens/ProximityScreen";
import {
  QrScannerScreen,
  type QrScannerScreenParams,
} from "../screens/QrScannerScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { TrustScreen } from "../screens/TrustScreen";
import { WalletInstanceScreen } from "../screens/WalletInstanceScreen";
import { setDebugVisibility } from "../store/reducers/debug";
import { selectLoggingAddress } from "../store/reducers/environment";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { initLogging } from "../utils/logging";

/**
 * MainStackNav parameters list for each defined screen.
 */
export type MainStackNavParamList = {
  CredentialOffer: undefined;
  Credentials: undefined;
  CredentialsCatalogue: undefined;
  CredentialStatus: undefined;
  Home: undefined;
  Pid: undefined;
  Presentations: undefined;
  Proximity: undefined;
  QrScanner: QrScannerScreenParams;
  Settings: undefined;
  Trust: undefined;
  WalletInstance: undefined;
};

const Stack = createNativeStackNavigator<MainStackNavParamList>();

const lightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: IOThemeLight["appBackground-primary"],
    card: IOThemeLight["appBackground-primary"],
  },
};

export const MainStackNavigator = () => {
  const loggingServerAddr = useAppSelector(selectLoggingAddress);
  const dispatch = useAppDispatch();

  /**
   * Sets the logging environment when the selected environment changes.
   */
  useEffect(() => {
    initLogging(loggingServerAddr);
  }, [loggingServerAddr]);

  const headerRight = useCallback(
    () => (
      <IconButton
        accessibilityLabel={"debug"}
        icon="ladybug"
        onPress={() => dispatch(setDebugVisibility(true))}
      />
    ),
    [dispatch],
  );

  return (
    <NavigationContainer theme={lightTheme}>
      <Stack.Navigator>
        <Stack.Group
          screenOptions={{
            headerRight: headerRight,
            headerTitle: HeaderTitle,
          }}
        >
          <Stack.Screen
            component={HomeScreen}
            name="Home"
            options={{ title: "ITW Test" }}
          />
          <Stack.Screen
            component={WalletInstanceScreen}
            name="WalletInstance"
            options={{ title: "Wallet Instance" }}
          />
          <Stack.Screen
            component={PidScreen}
            name="Pid"
            options={{ title: "PID issuance" }}
          />
          <Stack.Screen
            component={CredentialScreen}
            name="Credentials"
            options={{ title: "Credentials issuance" }}
          />
          <Stack.Screen
            component={CredentialStatusScreen}
            name="CredentialStatus"
            options={{ title: "Credential status" }}
          />
          <Stack.Screen
            component={PresentationScreen}
            name="Presentations"
            options={{ title: "Presentation" }}
          />
          <Stack.Screen
            component={TrustScreen}
            name="Trust"
            options={{ title: "Trust" }}
          />
          <Stack.Screen
            component={QrScannerScreen}
            name="QrScanner"
            options={{ title: "Scan QR" }}
          />
          <Stack.Screen
            component={ProximityScreen}
            name="Proximity"
            options={{ title: "Proximity" }}
          />
          <Stack.Screen
            component={OfferScreen}
            name="CredentialOffer"
            options={{ title: "Credential Offer" }}
          />
          <Stack.Screen
            component={CredentialsCatalogueScreen}
            name="CredentialsCatalogue"
            options={{ title: "Credentials Catalogue" }}
          />
          <Stack.Screen
            component={SettingsScreen}
            name="Settings"
            options={{ title: "Settings" }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};
