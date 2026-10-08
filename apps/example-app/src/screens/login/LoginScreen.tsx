import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  IOButton,
  IOVisualCostants,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React from "react";
import { StyleSheet, View } from "react-native";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { sessionSkip } from "../../store/reducers/session";
import { useAppDispatch } from "../../store/utils";

type Props = NativeStackScreenProps<MainStackNavParamList, "Login">;

/**
 * Login screen which allows the user to login to IO with SPID or CIE, or to skip the login.
 */
export default function LoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();

  return (
    <View style={styles.container}>
      <IOButton
        label="Login with SPID"
        onPress={() => navigation.navigate("IdpSelection")}
        variant="solid"
      />
      <VSpacer />
      <IOButton
        label="Login with CIE + PIN"
        onPress={() => navigation.navigate("CieLogin")}
        variant="solid"
      />
      <VSpacer />
      <IOButton
        label="Skip login"
        onPress={() => dispatch(sessionSkip())}
        variant="outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: IOVisualCostants.appMarginDefault,
  },
});
