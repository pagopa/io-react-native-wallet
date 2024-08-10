import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { idps } from "../../utils/idps";
import URLParse from "url-parse";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackNavParamList } from "example/src/navigator/MainStackNavigator";

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

const IdpButton = ({
  idp,
  onPress,
}: {
  idp: (typeof idps)[number];
  onPress: (id: string) => void;
}) => (
  <TouchableOpacity onPress={() => onPress(idp.id)} style={[styles.item]}>
    <Text style={[styles.title]}>{idp.name}</Text>
  </TouchableOpacity>
);

type Props = NativeStackScreenProps<MainStackNavParamList, "IdpSelection">;

/**
 * IDP selection screen which allows the user to select an IDP to login with.
 * After selecting an IDP, the user is redirected to the IDP login page via {@link IdpLoginScreen}
 */
export default function IdpSelectionScreen({ navigation }: Props) {
  const handleIdpSelection = (id: string) => {
    navigation.navigate("IdpLogin", { idp: id });
  };

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={<Text>Login to IO backend with your IDP</Text>}
        data={idps}
        renderItem={(list) => (
          <IdpButton
            idp={list.item}
            onPress={(id: string) => {
              handleIdpSelection(id);
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  item: {
    backgroundColor: "#5cfebe",
    padding: 2,
    marginVertical: 1,
    marginHorizontal: 1,
  },
  title: {
    fontSize: 24,
  },
  webview: { width: 400, height: 800 },
});
