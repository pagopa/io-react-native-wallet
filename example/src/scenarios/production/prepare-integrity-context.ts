import { type IntegrityContext } from "@pagopa/io-react-native-wallet";
import { error, result } from "../types";
import {
  generateHarwareKeyTag,
  getIntegrityContext,
} from "example/src/contexts";

export default (
    setIntegrityContext: React.Dispatch<
      React.SetStateAction<IntegrityContext | undefined>
    >
  ) =>
  async () => {
    try {
      console.log(generateHarwareKeyTag);
      const hardwarekeyTag = await generateHarwareKeyTag();
      const integrityContext = getIntegrityContext(hardwarekeyTag);
      setIntegrityContext(integrityContext);

      return result(integrityContext);
    } catch (e) {
      console.error(e);
      return error(e);
    }
  };
