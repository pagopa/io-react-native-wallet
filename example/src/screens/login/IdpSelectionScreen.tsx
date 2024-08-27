import React from "react";
import { idps, type Idp } from "../../utils/idps";
import URLParse from "url-parse";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import IdpsGrid from "../../components/IdpsGrid";
import { VSpacer } from "@pagopa/io-app-design-system";

export const getIntentFallbackUrl = (intentUrl: string): string | undefined => {
  const intentProtocol = URLParse.extractProtocol(intentUrl);
  if (intentProtocol.protocol !== "intent:" || !intentProtocol.slashes) {
    return undefined;
  }
  const hook = "S.browser_fallback_url=";
  const hookIndex = intentUrl.indexOf(hook);
  const endIndex = intentUrl.indexOf(";end", hookIndex + hook.length);
  if (hookIndex !== -1 && endIndex !== -1) {
    return intentUrl.substring(hookIndex + hook.length, endIndex);
  }
  return undefined;
};

type Props = NativeStackScreenProps<MainStackNavParamList, "IdpSelection">;

/**
 * IDP selection screen which allows the user to select an IDP to login with.
 * After selecting an IDP, the user is redirected to the IDP login page via {@link IdpLoginScreen}
 */
export default function IdpSelectionScreen({ navigation }: Props) {
  const handleIdpSelection = (idp: Idp) => {
    navigation.navigate("IdpLogin", { idp: idp.id });
  };

  return (
    <IdpsGrid
      testID="idps-grid"
      idps={idps}
      onIdpSelected={handleIdpSelection}
      headerComponent={<VSpacer size={40} />}
      footerComponent={<VSpacer size={40} />}
    />
  );
}
