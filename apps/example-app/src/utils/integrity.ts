import type { IntegrityContext } from "@io-app-it-wallet/io-react-native-wallet";

import { fixBase64EncodingOnKey } from "@io-app-it-wallet/io-react-native-wallet";
import { generate, getPublicKey, sign } from "@pagopa/io-react-native-crypto";
import { encode } from "js-base64";
import { v4 as uuidv4 } from "uuid";

/**
 * Type returned by the getHardwareSignatureWithAuthData function of {@link IntegrityContext}.
 * It contains the signature and the authenticator data.
 */
interface HardwareSignatureWithAuthData {
  authenticatorData: string;
  signature: string;
}

/**
 * Generates the hardware signature with the authentication data.
 * The trust model of the wallet provider is not implemented, thus the authenticator data is not needed and
 * no app integrity check is performed on the device. We only return the signed client data with
 * a hardware backed key on both platforms.
 * @param hardwareKeyTag - the hardware key tag to use for the signature.
 * @param clientData - the client data to sign.
 */
const getHardwareSignatureWithAuthData = async (
  hardwareKeyTag: string,
  clientData: string,
): Promise<HardwareSignatureWithAuthData> => {
  // Client data should be hashed however it is not done in this implementation.
  const signature = await sign(clientData, hardwareKeyTag);
  return { authenticatorData: "NOT_IMPLEMENTED", signature };
};

/**
 * Generates the hardware backed key used as the integrity key.
 * @returns a promise that resolves with the key tag as string or rejects with an error.
 */
const generateIntegrityHardwareKeyTag = async () => {
  const keyTag = uuidv4();
  await generate(keyTag);
  return keyTag;
};

/**
 * Generates a device attestation. The trust model of the wallet provider is not implemented, thus this check is skipped
 * and only the public key associated with the hardware key tag is returned.
 * @param _ - the challenge, currently not used.
 * @param hardwareKeyTag - the hardware keytag from which to extract the public key
 * @returns a promise that resolves with the base64 encoded JSON stringified public key.
 */
const getAttestation = async (
  _: string,
  hardwareKeyTag: string,
): Promise<string> => {
  const pk = await getPublicKey(hardwareKeyTag);
  return encode(JSON.stringify(fixBase64EncodingOnKey(pk)));
};

const getIntegrityContext = (hardwareKeyTag: string): IntegrityContext => ({
  getAttestation: (nonce: string) => getAttestation(nonce, hardwareKeyTag),
  getHardwareKeyTag: () => hardwareKeyTag,
  getHardwareSignatureWithAuthData: (clientData) =>
    getHardwareSignatureWithAuthData(hardwareKeyTag, clientData),
});

export { generateIntegrityHardwareKeyTag, getIntegrityContext };
