import { useIOToast, VSpacer } from "@pagopa/io-app-design-system";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback } from "react";
import IdpsGrid from "../../components/IdpsGrid";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import { selectEnv } from "../../store/reducers/environment";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { preparePidFlowParamsThunk } from "../../thunks/pid";
import { getSpidIdpHint, idps, testIdps, type Idp } from "../../utils/idps";

type Props = NativeStackScreenProps<
  MainStackNavParamList,
  "PidSpidIdpSelection"
>;

/**
 * IDP selection for the PID authentication flow. This screen dinamically renders the IDPs list based on the environment.
 * After selecting an IDP, the user is redirected back to the PID screen with the different scenarios where the authentication flow happens.
 */
export default function PidSpidIdpSelectionScreen({
  navigation,
  route,
}: Props) {
  const toast = useIOToast();
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);
  const idpsList = env === "pre" ? testIdps : idps; // Use test IDPs if the login is for PID auth in the pre environment, otherwise use the standard IDPs list
  const { withMRTDPoP = false } = route.params;

  const handleIdpSelection = useCallback(
    async (idp: Idp) => {
      navigation.goBack();
      const idpHint = getSpidIdpHint(idp.id);
      if (!idpHint) {
        toast.error("IDP hint not found");
      } else {
        try {
          const { authUrl, redirectUri } = await dispatch(
            preparePidFlowParamsThunk({
              idpHint,
              withMRTDPoP,
            })
          ).unwrap();
          navigation.navigate("PidSpidLogin", {
            authUrl,
            redirectUri,
          });
        } catch (error) {
          toast.error("Error during authentication");
        }
      }
    },
    [navigation, dispatch, withMRTDPoP, toast]
  );

  return (
    <IdpsGrid
      testID="idps-grid"
      idps={idpsList}
      onIdpSelected={handleIdpSelection}
      headerComponent={<VSpacer size={40} />}
      footerComponent={<VSpacer size={40} />}
    />
  );
}
