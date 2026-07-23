import { generate } from "@pagopa/io-react-native-crypto";
import { getAttestation } from "@pagopa/io-react-native-integrity";
import {
  createCryptoContextFor,
  IoWallet,
  type KeyAttestationCryptoContext,
  type WalletInstanceAttestation as Wia,
  type WalletUnitAttestation as Wua,
} from "@pagopa/io-react-native-wallet";
import { Platform } from "react-native";

import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { selectInstanceKeyTag } from "../store/reducers/instance";
import { regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import { isAndroid } from "../utils/device";
import { getEnv } from "../utils/environment";
import appFetch from "../utils/fetch";
import {
  ensureIntegrityServiceIsReady,
  getIntegrityContext,
} from "../utils/integrity";
import { createAppAsyncThunk } from "./utils";

type GetAttestationThunkOutput = Awaited<
  ReturnType<Wia.WalletInstanceAttestationApi["getAttestation"]>
>;
/**
 * Thunk to obtain a new Wallet Instance Attestation.
 */
export const getWalletInstanceAttestationThunk = createAppAsyncThunk<
  GetAttestationThunkOutput,
  undefined
>("walletinstance/walletinstanceattestation", async (_, { getState }) => {
  // Retrieve the integrity key tag from the store and create its context
  const integrityKeyTag = selectInstanceKeyTag(getState());
  if (!integrityKeyTag) {
    throw new Error("Integrity key not found");
  }
  const integrityContext = getIntegrityContext(integrityKeyTag);

  // generate Key for Wallet Instance Attestation
  // ensure the key esists befor starting the issuing process
  await regenerateCryptoKey(WIA_KEYTAG);
  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Get env URLs
  const env = selectEnv(getState());
  const { GOOGLE_CLOUD_PROJECT_NUMBER, WALLET_PROVIDER_BASE_URL } = getEnv(env);
  const googleCloudProjectNumber = isAndroid
    ? GOOGLE_CLOUD_PROJECT_NUMBER
    : undefined;
  await ensureIntegrityServiceIsReady(googleCloudProjectNumber);

  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });
  /**
   * Obtains a new Wallet Instance Attestation.
   * WARNING: The integrity context must be the same used when creating the Wallet Instance with the same keytag.
   */
  const issuingAttestation =
    await wallet.WalletInstanceAttestation.getAttestation(
      {
        walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
        walletSolutionId: "appio",
        walletSolutionVersion: "3.26.0",
      },
      {
        appFetch,
        integrityContext,
        wiaCryptoContext,
      },
    );
  return issuingAttestation;
});

interface GetWalletUnitAttestationThunkInput {
  keyTags: string[];
}
type GetWalletUnitAttestationThunkOutput = Awaited<
  ReturnType<Wua.WalletUnitAttestationSupportedApi["getAttestation"]>
>;
export const getWalletUnitAttestationThunk = createAppAsyncThunk<
  GetWalletUnitAttestationThunkOutput,
  GetWalletUnitAttestationThunkInput
>("walletinstance/walletunitattestation", async ({ keyTags }, { getState }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  if (!wallet.WalletUnitAttestation.isSupported) {
    throw new Error(
      `Wallet Unit Attestation is not supported in v${itwVersion}`,
    );
  }

  // Retrieve the integrity key tag from the store and create its context
  const integrityKeyTag = selectInstanceKeyTag(getState());
  if (!integrityKeyTag) {
    throw new Error("Integrity key not found");
  }
  const integrityContext = getIntegrityContext(integrityKeyTag);

  // Get env URLs
  const env = selectEnv(getState());
  const { GOOGLE_CLOUD_PROJECT_NUMBER, WALLET_PROVIDER_BASE_URL } = getEnv(env);
  const googleCloudProjectNumber = isAndroid
    ? GOOGLE_CLOUD_PROJECT_NUMBER
    : undefined;
  await ensureIntegrityServiceIsReady(googleCloudProjectNumber);

  return await wallet.WalletUnitAttestation.getAttestation(
    {
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
      walletSolutionId: "appio",
      walletSolutionVersion: "3.26.0",
    },
    {
      appFetch,
      integrityContext,
      keysToAttest: keyTags.map(createKeyAttestationCryptoContextFor),
    },
  );
});

const createKeyAttestationCryptoContextFor = (
  keyTag: string,
): KeyAttestationCryptoContext => ({
  ...createCryptoContextFor(keyTag),
  generateKeyWithAttestation(challenge) {
    return Platform.select({
      android: async () => {
        const attestation = await getAttestation(challenge, keyTag);
        return { attestation, success: true };
      },
      default: () => {
        throw new Error("Unsupported platform");
      },
      // No key attestation on iOS, only key pair creation
      ios: async () => {
        await generate(keyTag);
        return { success: true };
      },
    })();
  },
});
