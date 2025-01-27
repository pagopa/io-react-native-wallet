/* eslint-disable react-native/no-inline-styles */
import { Alert, SafeAreaView, ScrollView } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { ButtonSolid, IOVisualCostants } from "@pagopa/io-app-design-system";
import { selectSesssionId, sessionReset } from "../store/reducers/sesssion";
import { useDebugInfo } from "../hooks/useDebugInfo";

/**
 * Settings screen component which allows to change the environment and manage the session.
 */
const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const session = useAppSelector(selectSesssionId);

  useDebugInfo({
    session,
  });

  return (
    <SafeAreaView
      style={{ flex: 1, margin: IOVisualCostants.appMarginDefault }}
    >
      <ScrollView>
        <ButtonSolid
          fullWidth
          label="Reset App"
          onPress={() =>
            Alert.alert(
              "Reset App",
              "This will reset the app state to default",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                { text: "OK", onPress: () => dispatch(sessionReset()) },
              ]
            )
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
