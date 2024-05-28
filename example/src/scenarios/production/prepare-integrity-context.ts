import { type IntegrityContext } from "@pagopa/io-react-native-wallet";
import { generateHarwareKeyTag, getIntegrityContext } from "../../contexts";
import { error, result } from "../types";

type IntegrityContextSetter = React.Dispatch<
  React.SetStateAction<IntegrityContext | undefined>
>;

export default (setIntegrityContext: IntegrityContextSetter) => async () => {
  try {
    const hardwarekeyTag = await generateHarwareKeyTag();
    const integrityContext = getIntegrityContext(hardwarekeyTag);
    setIntegrityContext(integrityContext);

    return result(integrityContext);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
