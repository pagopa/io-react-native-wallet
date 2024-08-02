import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { idps } from "./utils/idps";
import { useDispatch } from "react-redux";
import { sessionSet } from "./store/actions/session";
import { WALLET_PROVIDER_BASE_URL } from "@env";

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

const getLoginUri = (idp: string) => {
  let url = new URL(WALLET_PROVIDER_BASE_URL);
  url.pathname = `/login?entityID=${idp}&authLevel=SpidL2`;
  return url.href;
};

export default function LoginComponent() {
  const [idp, setIdp] = React.useState<string | undefined>();
  const dispatch = useDispatch();

  return (
    <View style={styles.container}>
      {idp ? (
        <WebView
          source={{
            uri: getLoginUri(idp),
          }}
          style={styles.webview}
          onNavigationStateChange={(el) => {
            console.log(el.url);
            if (el.url.includes("profile.html")) {
              const urlParams = new URL(el.url);
              const token = urlParams.searchParams.get("token");
              console.log(el.url, token);
              token && dispatch(sessionSet(token));
            }
          }}
        />
      ) : (
        <FlatList
          ListHeaderComponent={<Text>Login to IO backend with your IDP</Text>}
          data={idps}
          renderItem={(list) => (
            <IdpButton
              idp={list.item}
              onPress={(id: string) => {
                setIdp(id);
              }}
            />
          )}
        />
      )}
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
