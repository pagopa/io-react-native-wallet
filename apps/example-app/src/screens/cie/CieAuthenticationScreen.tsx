import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import React, { useCallback } from "react";
import { Alert } from "react-native";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { CiePinAuthentication } from "../../components/cie/CiePinAuthentication";
import { selectEnv } from "../../store/reducers/environment";
import { pidFlowReset } from "../../store/reducers/pid";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import {
  CIE_L3_REDIRECT_URI,
  continuePidFlowThunk,
  preparePidFlowParamsThunk,
} from "../../thunks/pid";
import { getCieIdpHint, getEnv } from "../../utils/environment";

type ScreenProps = NativeStackScreenProps<
  MainStackNavParamList,
  "CieAuthentication"
>;

/**
 * PID issuance authentication with CIE + PIN.
 * The PID flow continues with the redirect URL of the consent page.
 */
export const CieAuthenticationScreen = ({ navigation }: ScreenProps) => {
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);

  const handleError = useCallback(
    (error: unknown) => {
      navigation.goBack();
      dispatch(pidFlowReset());
      Alert.alert(`❌ Error`, `${JSON.stringify(error)}`);
    },
    [navigation, dispatch],
  );

  const getAuthenticationUrl = async (pin: string) => {
    const { authUrl } = await dispatch(
      preparePidFlowParamsThunk({
        authMethod: "cieL3",
        ciePin: pin,
        idpHint: getCieIdpHint(env),
      }),
    ).unwrap();
    return authUrl;
  };

  const handleConsentNavigation = (url: string) => {
    if (!url.includes(CIE_L3_REDIRECT_URI)) return false;
    dispatch(continuePidFlowThunk({ authRedirectUrl: url }));
    navigation.goBack();
    return true;
  };

  return (
    <CiePinAuthentication
      customIdpUrl={getEnv(env).CIE_CUSTOM_IDP_URL}
      getAuthenticationUrl={getAuthenticationUrl}
      onCancel={() => navigation.goBack()}
      onConsentNavigation={handleConsentNavigation}
      onError={handleError}
    />
  );
};
