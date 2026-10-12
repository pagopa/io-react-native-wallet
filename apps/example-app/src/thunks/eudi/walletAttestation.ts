import {
  createCryptoContextFor,
  Eudi,
} from "@io-app-it-wallet/io-react-native-wallet";
import { v4 as uuidv4 } from "uuid";

import {
  selectEudiWalletInstance,
  selectEudiWalletInstanceOrThrow,
} from "../../store/reducers/eudi/walletAttestation";
import { regenerateCryptoKey } from "../../utils/crypto";
import {
  EUDI_WALLET_PROVIDER_BASE_URL,
  EUDI_WIA_KEYTAG,
} from "../../utils/eudi";
import {
  createEudiWalletProviderFetch,
  generateEudiIntegrityKeyTag,
  getEudiIntegrityContext,
} from "../../utils/eudiWalletProvider";
import { createAppAsyncThunk } from "../utils";

export interface EudiWalletInstance {
  /** Tag of the hardware key, which identifies the Wallet Instance */
  keyTag: string;
  /** Identifier of the user the Wallet Instance belongs to, sent to the Wallet Provider */
  userId: string;
}

/**
 * Thunk to register a new EUDI Wallet Instance to the test EUDI Wallet Provider,
 * separate from the IT-Wallet one. Each Wallet Instance belongs to a new random user.
 */
export const createEudiWalletInstanceThunk = createAppAsyncThunk<
  EudiWalletInstance,
  undefined
>("eudi/walletInstanceCreate", async (_, { getState }) => {
  const userId = selectEudiWalletInstance(getState())?.userId ?? uuidv4();
  const keyTag = await generateEudiIntegrityKeyTag();

  await Eudi.WalletAttestation.createWalletInstance({
    appFetch: createEudiWalletProviderFetch(userId),
    integrityContext: getEudiIntegrityContext(keyTag),
    walletProviderBaseUrl: EUDI_WALLET_PROVIDER_BASE_URL,
  });

  return { keyTag, userId };
});

/**
 * Thunk to obtain a Wallet Attestation from the test EUDI Wallet Provider,
 * bound to a new {@link EUDI_WIA_KEYTAG} key.
 * @returns The Wallet Attestation in JWT format
 */
export const getEudiWalletAttestationThunk = createAppAsyncThunk<
  string,
  undefined
>("eudi/walletAttestationGet", async (_, { getState }) => {
  const { keyTag, userId } = selectEudiWalletInstanceOrThrow(getState());

  await regenerateCryptoKey(EUDI_WIA_KEYTAG);

  return Eudi.WalletAttestation.getWalletAttestation(
    {
      walletProviderBaseUrl: EUDI_WALLET_PROVIDER_BASE_URL,
      walletSolutionId: "appio",
      walletSolutionVersion: "3.26.0",
    },
    {
      appFetch: createEudiWalletProviderFetch(userId),
      integrityContext: getEudiIntegrityContext(keyTag),
      wiaCryptoContext: createCryptoContextFor(EUDI_WIA_KEYTAG),
    },
  );
});
