import { IOToast } from "@pagopa/io-app-design-system";
import { File, Paths } from "expo-file-system";
import { Platform, Share } from "react-native";

/**
 * Shares a JSON text with the system share sheet. On iOS it is shared as a `.json` file, as
 * share targets drop long plain texts. On Android it is shared as text, which `Share` supports only.
 * @param name Name of the file, without extension
 */
export const shareJson = async (name: string, json: string) => {
  try {
    if (Platform.OS !== "ios") {
      await Share.share({ message: json });
      return;
    }
    const file = new File(Paths.cache, `${name.replace(/\W+/g, "_")}.json`);
    file.create({ overwrite: true });
    file.write(json);
    await Share.share({ url: file.uri });
  } catch (error) {
    IOToast.error(`Share failed: ${String(error)}`);
  }
};
