import React from "react";
import { getSpidIdpHint, idps, testIdps, type Idp } from "../../utils/idps";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import IdpsGrid from "../../components/IdpsGrid";
import { useIOToast, VSpacer } from "@pagopa/io-app-design-system";
import { selectEnv } from "../../store/reducers/environment";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { preparePidFlowParamsThunk } from "../../thunks/pid";

type Props = NativeStackScreenProps<
  MainStackNavParamList,
  "PidSpidIdpSelection"
>;

/**
 * IDP selection for the PID authentication flow. This screen dinamically renders the IDPs list based on the environment.
 * After selecting an IDP, the user is redirected back to the PID screen with the different scenarios where the authentication flow happens.
 */
export default function PidSpidIdpSelectionScreen({ navigation }: Props) {
  const toast = useIOToast();
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);
  const idpsList = env === "pre" ? testIdps : idps; // Use test IDPs if the login is for PID auth in the pre environment, otherwise use the standard IDPs list

  const handleIdpSelection = async (idp: Idp) => {
    navigation.goBack();
    const idpHint = getSpidIdpHint(idp.id);
    if (!idpHint) {
      toast.error("IDP hint not found");
    } else {
      try {
        const { authUrl } = await dispatch(
          preparePidFlowParamsThunk({
            idpHint,
            authMethod: "spid",
            credentialType: "PersonIdentificationData",
          })
        ).unwrap();
        
        navigation.navigate("PidSpidLogin", { authUrl });
      } catch (error) {
        toast.error("Error during authentication");
      }
    }
  };

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
