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
import {
  Icon,
  IconButton,
  IOThemeLight,
  IOVisualCostants,
} from "@pagopa/io-app-design-system";
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
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="WalletInstance"
              component={WalletInstanceScreen}
            />
            <Stack.Screen name="Pid" component={PidScreen} />
            <Stack.Screen name="Credentials" component={CredentialScreen} />
            <Stack.Screen
              name="StatusAttestation"
              component={StatusAttestationScreen}
            />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="IdpSelection" component={IdpSelectionScreen} />
            <Stack.Screen name="IdpLogin" component={IdpLoginScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
