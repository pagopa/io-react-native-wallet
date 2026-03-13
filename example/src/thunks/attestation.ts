import { Platform } from "react-native";
import {
  createCryptoContextFor,
  IoWallet,
  type WalletInstanceAttestation as Wia,
  type AttestationCryptoContext,
} from "@pagopa/io-react-native-wallet";
import { getAttestation } from "@pagopa/io-react-native-integrity";
import { generate } from "@pagopa/io-react-native-crypto";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import {
  ensureIntegrityServiceIsReady,
  getIntegrityContext,
} from "../utils/integrity";
import { regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import { selectInstanceKeyTag } from "../store/reducers/instance";
import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { getEnv } from "../utils/environment";
import { isAndroid } from "../utils/device";
import pkg from "../../package.json";

type GetAttestationThunkOutput = Awaited<
  ReturnType<Wia.WalletInstanceAttestationApi["getAttestation"]>
>;
/**
 * Thunk to obtain a new Wallet Instance Attestation.
 */
export const getAttestationThunk = createAppAsyncThunk<
  GetAttestationThunkOutput,
  void
>("walletinstance/attestation", async (_, { getState }) => {
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
  const { WALLET_PROVIDER_BASE_URL, GOOGLE_CLOUD_PROJECT_NUMBER } = getEnv(env);
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
        walletSolutionId: pkg.name,
        walletSolutionVersion: pkg.version,
      },
      {
        wiaCryptoContext,
        integrityContext,
        appFetch,
      }
    );
  return issuingAttestation;
});

type GetWalletUnitAttestationThunkInput = {
  keyTags: string[];
};
export const getWalletUnitAttestationThunk = createAppAsyncThunk<
  any,
  GetWalletUnitAttestationThunkInput
>("walletinstance/walletunitattestation", async ({ keyTags }, { getState }) => {
  // Retrieve the integrity key tag from the store and create its context
  const integrityKeyTag = selectInstanceKeyTag(getState());
  if (!integrityKeyTag) {
    throw new Error("Integrity key not found");
  }
  const integrityContext = getIntegrityContext(integrityKeyTag);

  // Get env URLs
  const env = selectEnv(getState());
  const { WALLET_PROVIDER_BASE_URL, GOOGLE_CLOUD_PROJECT_NUMBER } = getEnv(env);
  const googleCloudProjectNumber = isAndroid
    ? GOOGLE_CLOUD_PROJECT_NUMBER
    : undefined;
  await ensureIntegrityServiceIsReady(googleCloudProjectNumber);

  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  const wua = await wallet.WalletInstanceAttestation.getWalletUnitAttestation(
    {
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
      walletSolutionId: pkg.name,
      walletSolutionVersion: pkg.version,
    },
    {
      integrityContext,
      attestationCryptoContexts: keyTags.map(createAttestationCryptoContextFor),
      appFetch,
    }
  );

  return wua;
});

const createAttestationCryptoContextFor = (
  keyTag: string
): AttestationCryptoContext => ({
  ...createCryptoContextFor(keyTag),
  generateKeyWithAttestation(challenge) {
    return Platform.select({
      android: async () => {
        const attestation = await getAttestation(challenge, keyTag);
        return { success: true, attestation };
      },
      // No key attestation on iOS, only key pair creation
      ios: async () => {
        await generate(keyTag);
        return { success: true };
      },
      default: () => {
        throw new Error("Unsupported platform");
      },
    })();
  },
});
