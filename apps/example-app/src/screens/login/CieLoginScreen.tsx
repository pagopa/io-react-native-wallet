import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import React, { useCallback } from "react";
import { Alert } from "react-native";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { CiePinAuthentication } from "../../components/cie/CiePinAuthentication";
import { selectEnv } from "../../store/reducers/environment";
import { sessionSet } from "../../store/reducers/session";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import {
  CIE_PROD_ENTITY_ID,
  extractIoLoginToken,
  getIoLoginUri,
} from "../../utils/login";

type ScreenProps = NativeStackScreenProps<MainStackNavParamList, "CieLogin">;

/**
 * IO login with CIE + PIN, always against the PROD CIE identity provider.
 * The session token is extracted from the final redirect of the consent page.
 */
export const CieLoginScreen = ({ navigation }: ScreenProps) => {
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);

  const handleError = useCallback(
    (error: unknown) => {
      navigation.goBack();
      Alert.alert(`❌ Error`, `${JSON.stringify(error)}`);
    },
    [navigation],
  );

  const handleConsentNavigation = (url: string) => {
    const token = extractIoLoginToken(url);
    if (token) {
      dispatch(sessionSet({ loginMethod: "cie", token }));
    }
    return !!token;
  };

  return (
    <CiePinAuthentication
      customIdpUrl={undefined}
      getAuthenticationUrl={async () =>
        getIoLoginUri(env, CIE_PROD_ENTITY_ID, "SpidL3")
      }
      onCancel={() => navigation.goBack()}
      onConsentNavigation={handleConsentNavigation}
      onError={handleError}
    />
  );
};
