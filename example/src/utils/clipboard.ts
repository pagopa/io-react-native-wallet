import Clipboard from "@react-native-clipboard/clipboard";
import { IOToast } from "@pagopa/io-app-design-system";

/**
 * Copy a text to the device clipboard and give a feedback.
 */
export const clipboardSetStringWithFeedback = (text: string) => {
  Clipboard.setString(text);

  IOToast.success("Copied to clipboard");
};
