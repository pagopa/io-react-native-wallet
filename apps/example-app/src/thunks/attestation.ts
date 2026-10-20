import {
  IoWallet,
  type KeyAttestation as Ka,
  type WalletInstanceAttestation as Wia,
} from "@io-app-it-wallet/io-react-native-wallet";
import { generate } from "@pagopa/io-react-native-crypto";
import { getAttestation } from "@pagopa/io-react-native-integrity";
import { Platform } from "react-native";

import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { selectInstanceKeyTag } from "../store/reducers/instance";
import { isAndroid } from "../utils/device";
import { getEnv } from "../utils/environment";
import appFetch from "../utils/fetch";
import {
  ensureIntegrityServiceIsReady,
  getIntegrityContext,
} from "../utils/integrity";
import {
  createLocalSignerFor,
  regenerateLocalCryptoKey,
  WIA_KEYTAG,
} from "../utils/localCrypto";
import { createAppAsyncThunk } from "./utils";

export type GetAttestationThunkOutput = Awaited<
  ReturnType<Wia.WalletInstanceAttestationApi["getAttestation"]>
>;
export type GetKeyAttestationThunkOutput = Awaited<
  ReturnType<Ka.KeyAttestationSupportedApi["getAttestation"]>
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
  await regenerateLocalCryptoKey(WIA_KEYTAG);
  const wiaSigner = createLocalSignerFor(WIA_KEYTAG);

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
        wiaSigner,
      },
    );
  return issuingAttestation;
});

interface GetKeyAttestationThunkInput {
  keyTags: string[];
}
export const getKeyAttestationThunk = createAppAsyncThunk<
  GetKeyAttestationThunkOutput,
  GetKeyAttestationThunkInput
>("walletinstance/keyattestation", async ({ keyTags }, { getState }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  if (!wallet.KeyAttestation.isSupported) {
    throw new Error(`Key Attestation is not supported in v${itwVersion}`);
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

  // 1. Obtain the challenge to generate the keys to attest
  const challenge = await wallet.KeyAttestation.getChallenge(
    { walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL },
    { appFetch },
  );

  // 2. Generate each key using the challenge
  const keysToAttest = await Promise.all(
    keyTags.map((keyTag) => generateKeyToAttest(keyTag, challenge)),
  );

  // 3. Request the Key Attestation
  return await wallet.KeyAttestation.getAttestation(
    {
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
      walletSolutionId: "appio",
      walletSolutionVersion: "3.26.0",
    },
    {
      appFetch,
      challenge,
      integrityContext,
      keysToAttest,
    },
  );
});

const generateKeyToAttest = (
  keyTag: string,
  challenge: string,
): Promise<Ka.KeyToAttest> =>
  Platform.select({
    android: async () => ({
      // The key attestation is bound to the challenge
      attestation: await getAttestation(challenge, keyTag),
      signer: createLocalSignerFor(keyTag),
    }),
    default: () => {
      throw new Error("Unsupported platform");
    },
    // No key attestation on iOS, only key pair creation
    ios: async () => {
      await generate(keyTag);
      return { signer: createLocalSignerFor(keyTag) };
    },
  })();
