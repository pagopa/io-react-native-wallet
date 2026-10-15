import type { IntegrityContext } from "@io-app-it-wallet/io-react-native-wallet";

import { getPublicKeyFixed, sign } from "@pagopa/io-react-native-crypto";
import { v4 as uuidv4 } from "uuid";

import { regenerateCryptoKey } from "./crypto";

/**
 * Fetch for the EUDI Wallet Provider, called directly without the IO backend:
 * the user, usually set by the IO backend from the session, is sent in the `x-user-id` header.
 * @param userId - Identifier of the user that owns the Wallet Instance
 */
export const createEudiWalletProviderFetch =
  (userId: string): typeof fetch =>
  (input, init) =>
    fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        "x-spec-version": "1.3",
        "x-user-id": userId,
      },
    });

/**
 * Generates the hardware key of an EUDI Wallet Instance.
 * @returns the key tag
 */
export const generateEudiIntegrityKeyTag = async () => {
  const keyTag = uuidv4().toString();
  await regenerateCryptoKey(keyTag);
  return keyTag;
};

/**
 * {@link IntegrityContext} of an EUDI Wallet Instance.
 * The EUDI Wallet Provider does not implement the app integrity check yet, so:
 * - the attestation is the public key of the hardware key, as base64 JSON;
 * - the client data is only signed with the hardware key, without authenticator data.
 * @param hardwareKeyTag - the hardware key tag bound to the Wallet Instance
 */
export const getEudiIntegrityContext = (
  hardwareKeyTag: string,
): IntegrityContext => ({
  getAttestation: async () =>
    btoa(JSON.stringify(await getPublicKeyFixed(hardwareKeyTag))),
  getHardwareKeyTag: () => hardwareKeyTag,
  getHardwareSignatureWithAuthData: async (clientData) => ({
    authenticatorData: "NOT_IMPLEMENTED",
    // The client data is not hashed
    signature: await sign(clientData, hardwareKeyTag),
  }),
});
