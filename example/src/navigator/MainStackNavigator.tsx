import { IconButton, IOThemeLight } from "@pagopa/io-app-design-system";
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useCallback, useEffect } from "react";

import type { SupportedCredentialsWithoutPid } from "../store/types";

import { HeaderTitle } from "../components/HeaderTitle";
import { CieAuthenticationScreen } from "../screens/cie/CieAuthenticationScreen";
import { CieIdAuthenticationScreen } from "../screens/cie/CieIdAuthenticationScreen";
import { CieInternalAuthenticationScreen } from "../screens/cie/CieInternalAuthenticationScreen";
import { CredentialsCatalogueScreen } from "../screens/CredentialsCatalogue";
import { CredentialScreen } from "../screens/CredentialScreen";
import { CredentialStatusScreen } from "../screens/CredentialStatusScreen";
import HomeScreen from "../screens/HomeScreen";
import IdpLoginScreen from "../screens/login/IdpLoginScreen";
import IdpSelectionScreen from "../screens/login/IdpSelectionScreen";
import PidSpidLoginScreen from "../screens/login/PidLoginScreen";
import PidSpidIdpSelectionScreen from "../screens/login/PidSpidIdpSelectionScreen";
import { OfferScreen } from "../screens/OfferScreen";
import { PidScreen } from "../screens/PidScreen";
import { PresentationScreen } from "../screens/PresentationScreen";
import { ProximityScreen } from "../screens/ProximityScreen";
import {
  QrScannerScreen,
  type QrScannerScreenParams,
} from "../screens/QrScannerScreen";
import SettingsScreen from "../screens/SettingsScreen";
import {
  TrustmarkQrCodeScreen,
  TrustmarkScreen,
} from "../screens/TrustmarkScreen";
import { TrustScreen } from "../screens/TrustScreen";
import { WalletInstanceScreen } from "../screens/WalletInstanceScreen";
import { setDebugVisibility } from "../store/reducers/debug";
import { selectLoggingAddress } from "../store/reducers/environment";
import { selectIoAuthToken } from "../store/reducers/session";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { initLogging } from "../utils/logging";
import { labelByCredentialType } from "../utils/ui";

/**
 * MainStackNav parameters list for each defined screen.
 */
export interface MainStackNavParamList {
  CieAuthentication: undefined;
  CieIdAuthentication: {
    authUrl: string;
    redirectUri: string;
    withDocumentProof?: boolean;
  };
  CieInternalAuthentication: { challenge: string; redirectUri: string };
  CredentialOffer: undefined;
  Credentials: undefined;
  CredentialsCatalogue: undefined;
  CredentialStatus: undefined;
  Home: undefined;
  IdpLogin: { idp: string };
  IdpSelection: undefined;
  Login: undefined;
  Pid: undefined;
  PidSpidIdpSelection: { withDocumentProof?: boolean };
  PidSpidLogin: {
    authUrl: string;
    redirectUri: string;
    withDocumentProof?: boolean;
  };
  Presentations: undefined;
  Proximity: undefined;
  QrScanner: QrScannerScreenParams;
  Settings: undefined;
  Trust: undefined;
  Trustmark: undefined;
  TrustmarkQrCode: { credentialType: SupportedCredentialsWithoutPid };
  WalletInstance: undefined;
}

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
  const ioAuthToken = useAppSelector(selectIoAuthToken);
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
        {ioAuthToken ? (
          /*
           * Protected routes via the ioAuthToken
           */
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
              component={PidSpidIdpSelectionScreen}
              name="PidSpidIdpSelection"
              options={{ title: "PID issuance" }}
            />
            <Stack.Screen
              component={CieAuthenticationScreen}
              name="CieAuthentication"
              options={{ title: "CIE Authentication" }}
            />
            <Stack.Screen
              component={CieIdAuthenticationScreen}
              name="CieIdAuthentication"
              options={{ title: "CieID Authentication" }}
            />
            <Stack.Screen
              component={CieInternalAuthenticationScreen}
              name="CieInternalAuthentication"
              options={{ title: "CIE Internal Authentication" }}
            />
            <Stack.Screen
              component={PidSpidLoginScreen}
              name="PidSpidLogin"
              options={{ title: "PID SPID Login" }}
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
              component={TrustmarkScreen}
              name="Trustmark"
              options={{ title: "Credentials trustmark" }}
            />
            <Stack.Screen
              component={TrustmarkQrCodeScreen}
              name="TrustmarkQrCode"
              options={({ route }) => ({
                title: `${
                  labelByCredentialType[route.params.credentialType]
                } trustmark`,
              })}
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
        ) : (
          <Stack.Group>
            <Stack.Screen
              component={IdpSelectionScreen}
              name="IdpSelection"
              options={{ title: "IO Login" }}
            />
            <Stack.Screen
              component={IdpLoginScreen}
              name="IdpLogin"
              options={{ title: "IO Login" }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
