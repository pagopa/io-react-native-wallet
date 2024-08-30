import React from "react";
import { getSpidIdpHint, idps, testIdps, type Idp } from "../../utils/idps";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import IdpsGrid from "../../components/IdpsGrid";
import { useIOToast, VSpacer } from "@pagopa/io-app-design-system";
import { selectEnv } from "../../store/reducers/environment";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { getPidThunk } from "../../thunks/pid";

type Props = NativeStackScreenProps<MainStackNavParamList, "PidSpidLogin">;

/**
 * IDP selection screen which allows the user to select an IDP to login with.
 * After selecting an IDP, the user is redirected to the IDP login page via {@link IdpLoginScreen}
 */
export default function PidSpidLoginScreen({ navigation }: Props) {
  const toast = useIOToast();
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);
  const idpsList = env === "pre" ? testIdps : idps; // Use test IDPs if the login is for PID auth in the pre environment, otherwise use the standard IDPs list

  const handleIdpSelection = (idp: Idp) => {
    navigation.goBack();
    const idpHint = getSpidIdpHint(idp.id);
    if (!idpHint) {
      toast.error("IDP hint not found");
    } else {
      dispatch(
        getPidThunk({
          credentialType: "PersonIdentificationData",
          idpHint,
          authMethod: "spid",
        })
      );
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
