import { type IntegrityContext } from "@pagopa/io-react-native-wallet";

import { error, result } from "./types";
import { getAttestation } from "@pagopa/io-react-native-integrity";
import {
  ensureIntegrityServiceIsReady,
  generateIntegrityHarwareKeyTag,
  getHardwareSignatureWithAuthData,
} from "../utils/integrity/integrity";

type IntegrityContextSetter = React.Dispatch<
  React.SetStateAction<IntegrityContext | undefined>
>;

/**
 * Prepare the integrity context which has different implementations for Android and iOS.
 * The functions called are platform specific and must be implemented in the platform specific code.
 * Currently they are implemented in `utils/integrity/integrity.android.ts` and `utils/integrity/integrity.ios.ts`.
 * @param setIntegrityContext - the callback function to set the integrity context.
 */
export default (setIntegrityContext: IntegrityContextSetter) => async () => {
  try {
    await ensureIntegrityServiceIsReady();
    const hardwarekeyTag = await generateIntegrityHarwareKeyTag();
    const integrityContext = await getIntegrityContext(hardwarekeyTag);
    setIntegrityContext(integrityContext);
    return result(integrityContext);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};

/**
 * Getter for platform specific {@link IntegrityContext}.
 * {@link ensureIntegrityServicyIsReady} and {@link generateIntegrityHarwareKeyTag} must be called before this function.
 * @param hardwareKeyTag - the hardware key tag to use for the integrity context, generated via {@link generateIntegrityHarwareKeyTag}.
 * @returns a promise that resolves with the integrity context or rejects with an error.
 */
const getIntegrityContext = async (
  hardwareKeyTag: string
): Promise<IntegrityContext> => {
  return {
    getHardwareKeyTag: () => hardwareKeyTag,
    getAttestation: (nonce: string) => getAttestation(nonce, hardwareKeyTag),
    getHardwareSignatureWithAuthData: (clientData) =>
      getHardwareSignatureWithAuthData(hardwareKeyTag, clientData),
  };
};
