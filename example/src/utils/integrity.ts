import { generate, getPublicKey, sign } from "@pagopa/io-react-native-crypto";
import uuid from "react-native-uuid";
import {
  fixBase64EncodingOnKey,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { encode } from "js-base64";

/**
 * Type returned by the getHardwareSignatureWithAuthData function of {@link IntegrityContext}.
 * It contains the signature and the authenticator data.
 */
export type HardwareSignatureWithAuthData = {
  signature: string;
  authenticatorData: string;
};

/**
 * Generates the hardware signature with the authentication data.
 * In the EUDIW wallet the trust model of the wallet provider is not implemented, thus the authenticator data is not needed and
 * we are not implementing any app's integrity check on the device running the wallet. Thus we only return the signed client data with
 * a hardware backed key on both platforms.
 * @param hardwareKeyTag - the hardware key tag to use for the signature.
 * @param clientData - the client data to sign.
 * @returns a function that takes the client data as string and returns a promise that resolves with the signature and the authenticator data or rejects with an error.
 */
const getHardwareSignatureWithAuthData = async (
  hardwareKeyTag: string,
  clientData: string
): Promise<HardwareSignatureWithAuthData> => {
  /**
   * Client data should be hashed however it is not done in this implementation.
   */
  const signature = await sign(clientData, hardwareKeyTag);
  return { signature, authenticatorData: "NOT_NEEDED" };
};

/**
 * Generates the hardware backed key for the current platform. iOS or Android are supported.
 * @returns a promise that resolves with the key tag as string or rejects with an error.
 */
const generateIntegrityHardwareKeyTag = async () => {
  const keyTag = uuid.v4().toString();
  await generate(keyTag);
  return keyTag;
};

/**
 * Generates a device attestation to attest that hardware key are stored in a secure environment.
 * In the EUDIW wallet the trust model of the wallet provider is not implemented, thus this check is skipped.
 * This implementation only returns the public key associated with the provider hardware key tag.
 * @param _ - the challenge, currently not used.
 * @param hardwareKeyTag - the hardware keytag from which to extract the public key
 * @returns a promise that resolves with the JSON stringified public key or rejects with an error.
 */
const getAttestation = async (
  _: string,
  hardwareKeyTag: string
): Promise<string> => {
  const pk = await getPublicKey(hardwareKeyTag);
  const fixedPk = fixBase64EncodingOnKey(pk);
  return encode(JSON.stringify(fixedPk));
};

/**
 * Implementation of the {@link IntegrityContext} from `io-react-native-wallet` interface.
 * @param hardwareKeyTag - the hardware key tag to use for the integrity context which is bound to the wallet instance.
 * @returns a context object which Adheres to the {@link IntegrityContext} interface
 */
const getIntegrityContext = (hardwareKeyTag: string): IntegrityContext => ({
  getHardwareKeyTag: () => hardwareKeyTag,
  getAttestation: (nonce: string) => getAttestation(nonce, hardwareKeyTag),
  getHardwareSignatureWithAuthData: (clientData) =>
    getHardwareSignatureWithAuthData(hardwareKeyTag, clientData),
});

export { generateIntegrityHardwareKeyTag, getIntegrityContext };
