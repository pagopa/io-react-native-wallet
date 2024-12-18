import { IconButton, IOThemeLight } from "@pagopa/io-app-design-system";
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useCallback } from "react";
import { CredentialScreen } from "../screens/CredentialScreen";
import HomeScreen from "../screens/HomeScreen";
import { PidScreen } from "../screens/PidScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { StatusAttestationScreen } from "../screens/StatusAttestationScreen";
import { WalletInstanceScreen } from "../screens/WalletInstanceScreen";
import { setDebugVisibility } from "../store/reducers/debug";
import { useAppDispatch } from "../store/utils";

/**
 * MainStackNav parameters list for each defined screen.
 */
export type MainStackNavParamList = {
  Home: undefined;
  WalletInstance: undefined;
  Pid: undefined;
  Credentials: undefined;
  StatusAttestation: undefined;
  Settings: undefined;
  PidSpidLogin: {
    authUrl: string;
    redirectUri: string;
  };
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
  const dispatch = useAppDispatch();

  const headerRight = useCallback(
    () => (
      <IconButton
        icon="ladybug"
        onPress={() => dispatch(setDebugVisibility(true))}
        accessibilityLabel={"debug"}
      />
    ),
    [dispatch]
  );

  return (
    <NavigationContainer theme={lightTheme}>
      <Stack.Navigator id="MainStackNavigator">
        <Stack.Group
          screenOptions={{
            headerRight: headerRight,
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "ITW Test" }}
          />
          <Stack.Screen
            name="WalletInstance"
            component={WalletInstanceScreen}
            options={{ title: "Test Wallet Instance" }}
          />
          <Stack.Screen
            name="Pid"
            component={PidScreen}
            options={{ title: "Test PID issuance" }}
          />
          <Stack.Screen
            name="Credentials"
            component={CredentialScreen}
            options={{ title: "Test credentials issuance" }}
          />
          <Stack.Screen
            name="StatusAttestation"
            component={StatusAttestationScreen}
            options={{ title: "Test credentials attestations" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};
