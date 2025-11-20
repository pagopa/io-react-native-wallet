import { Platform } from "react-native";

const iOSUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1";
export const defaultUserAgent = Platform.select({
  ios: iOSUserAgent,
  default: undefined,
});
