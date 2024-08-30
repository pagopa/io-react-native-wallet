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

  const header = useCallback(
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
              headerRight: header,
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
              options={{ title: "Wallet Instance" }}
            />
            <Stack.Screen
              name="Pid"
              component={PidScreen}
              options={{ title: "PID Issuance" }}
            />
            <Stack.Screen
              name="Credentials"
              component={CredentialScreen}
              options={{ title: "Credential Issuance" }}
            />
            <Stack.Screen
              name="StatusAttestation"
              component={StatusAttestationScreen}
              options={{ title: "Status Attestation" }}
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
