import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useCallback } from "react";
import { selectIoAuthToken } from "../store/reducers/sesssion";
import { useSelector } from "react-redux";
import HomeScreen from "../screens/HomeScreen";
import IdpSelectionScreen from "../screens/login/IdpSelectionScreen";
import IdpLoginScreen from "../screens/login/IdpLoginScreen";
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from "@react-navigation/native";
import { IconButton, IOThemeLight } from "@pagopa/io-app-design-system";
import { WalletInstanceScreen } from "../screens/WalletInstanceScreen";
import { PidScreen } from "../screens/PidScreen";
import { CredentialScreen } from "../screens/CredentialScreen";
import { StatusAttestationScreen } from "../screens/StatusAttestationScreen";
import { useAppDispatch } from "../store/utils";
import { setDebugVisibility } from "../store/reducers/debug";
import PidSpidLoginScreen from "../screens/login/PidSpidLoginScreen";
import SettingsScreen from "../screens/SettingsScreen";

/**
 * MainStackNav parameters list for each defined screen.
 */
export type MainStackNavParamList = {
  Home: undefined;
  WalletInstance: undefined;
  Pid: undefined;
  Credentials: undefined;
  StatusAttestation: undefined;
  Login: undefined;
  IdpSelection: undefined;
  IdpLogin: { idp: string };
  PidSpidLogin: undefined;
  Settings: undefined;
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
  const ioAuthToken = useSelector(selectIoAuthToken);
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
        {ioAuthToken ? (
          /*
           * Protected routes via the ioAuthToken
           */
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
              name="PidSpidLogin"
              component={PidSpidLoginScreen}
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
        ) : (
          <Stack.Group>
            <Stack.Screen
              name="IdpSelection"
              component={IdpSelectionScreen}
              options={{ title: "IO Login" }}
            />
            <Stack.Screen
              name="IdpLogin"
              component={IdpLoginScreen}
              options={{ title: "IO Login" }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
