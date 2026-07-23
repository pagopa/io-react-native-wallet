import "react-native-get-random-values";
import "react-native-quick-base64";
import { AppRegistry } from "react-native";
import { install } from "react-native-quick-crypto";

import { name as appName } from "./app.json";
import App from "./src/App";

install();

AppRegistry.registerComponent(appName, () => App);
