import { integrityUtils } from "./../../utils/integrity/index";
import { type IntegrityContext } from "@pagopa/io-react-native-wallet";

import { error, result } from "../types";

type IntegrityContextSetter = React.Dispatch<
  React.SetStateAction<IntegrityContext | undefined>
>;

export default (setIntegrityContext: IntegrityContextSetter) => async () => {
  try {
    await integrityUtils.ensureIntegrityServicyIsReady();
    const hardwarekeyTag =
      await integrityUtils.generateIntegrityHarwareKeyTag();
    const integrityContext = await integrityUtils.getIntegrityContext(
      hardwarekeyTag
    );
    setIntegrityContext(integrityContext);
    return result(integrityContext);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
