import {
  IoWallet,
  type KeyAttestation as Ka,
  type WalletInstanceAttestation as Wia,
} from "@io-app-it-wallet/io-react-native-wallet";
import { generate } from "@pagopa/io-react-native-crypto";

import { selectInstanceKeyTag } from "../store/reducers/instance";
import { selectXUserId } from "../store/reducers/user";
import {
  createLocalSignerFor,
  regenerateCryptoKey,
  WIA_KEYTAG,
} from "../utils/crypto";
import { getEnv, ITW_VERSION } from "../utils/environment";
import appFetch from "../utils/fetch";
import { getIntegrityContext } from "../utils/integrity";
import { createAppAsyncThunk } from "./utils";

export type GetAttestationThunkOutput = Awaited<
  ReturnType<Wia.WalletInstanceAttestationApi["getAttestation"]>
>;
export type GetKeyAttestationThunkOutput = Awaited<
  ReturnType<Ka.KeyAttestationApi["getAttestation"]>
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
  const wiaSigner = createLocalSignerFor(WIA_KEYTAG);

  // Get env URLs
  const { WALLET_PROVIDER_BASE_URL } = getEnv();

  const wallet = new IoWallet({ version: ITW_VERSION });
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
        xUserId: selectXUserId(getState()),
      },
      {
        appFetch,
        integrityContext,
        wiaSigner,
      },
    );
  return issuingAttestation;
});

/**
 * The keys to attest are either local keys, identified by their key tags and generated here,
 * or keys already prepared by the caller, such as the ones enrolled on the Remote WSCD.
 */
type GetKeyAttestationThunkInput =
  | { keysToAttest: Ka.KeyToAttest[] }
  | { keyTags: string[] };
export const getKeyAttestationThunk = createAppAsyncThunk<
  GetKeyAttestationThunkOutput,
  GetKeyAttestationThunkInput
>("walletinstance/keyattestation", async (input, { getState }) => {
  const wallet = new IoWallet({ version: ITW_VERSION });

  // Retrieve the integrity key tag from the store and create its context
  const integrityKeyTag = selectInstanceKeyTag(getState());
  if (!integrityKeyTag) {
    throw new Error("Integrity key not found");
  }
  const integrityContext = getIntegrityContext(integrityKeyTag);

  // Get env URLs
  const { WALLET_PROVIDER_BASE_URL } = getEnv();

  // 1. Obtain the challenge to generate the keys to attest
  const challenge = await wallet.KeyAttestation.getChallenge(
    { walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL },
    { appFetch },
  );

  // 2. Generate each key using the challenge
  const keysToAttest =
    "keysToAttest" in input
      ? input.keysToAttest
      : await Promise.all(
          input.keyTags.map((keyTag) => generateKeyToAttest(keyTag)),
        );

  // 3. Request the Key Attestation
  return await wallet.KeyAttestation.getAttestation(
    {
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
      walletSolutionId: "appio",
      walletSolutionVersion: "3.26.0",
      xUserId: selectXUserId(getState()),
    },
    {
      appFetch,
      challenge,
      integrityContext,
      keysToAttest,
    },
  );
});

// The key is generated without a key attestation, since app integrity checks are not implemented
const generateKeyToAttest = async (keyTag: string): Promise<Ka.KeyToAttest> => {
  await generate(keyTag);
  return { signer: createLocalSignerFor(keyTag) };
};
