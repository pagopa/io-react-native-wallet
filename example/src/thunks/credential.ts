import {
  Credential,
  WalletInstanceAttestation,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import { WALLET_EAA_PROVIDER_BASE_URL, WALLET_PROVIDER_BASE_URL } from "@env";
import appFetch from "../utils/fetch";
import { regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import { createAppAsyncThunk } from "./utils";
import { selectInstanceKeyTag } from "../store/reducers/instance";
import { getIntegrityContext } from "../utils/integrity";
import { selectCredential } from "../store/reducers/credential";
import type { CredentialResult, SupportedCredentials } from "../store/types";
import { getCredential, getPid } from "../utils/credential";

/**
 * Type definition for the input of the {@link getCredentialThunk}.
 */
type GetCredentialThunkInput =
  | {
      idpHint: string;
      credentialType: "PersonIdentificationData";
    }
  | {
      idpHint?: undefined;
      credentialType: Exclude<SupportedCredentials, "PersonIdentificationData">;
    };

/**
 * Type definition for the input of the {@link getCredentialStatusAttestationThunk}.
 */
type GetCredentialStatusAttestationThunkInput = {
  credentialType: SupportedCredentials;
  credential: Awaited<
    ReturnType<Credential.Issuance.ObtainCredential>
  >["credential"];
  keyTag: string;
};

/**
 * Type definition for the output of the {@link getCredentialStatusAttestationThunk}.
 */
type GetCredentialStatusAttestationThunkOutput = {
  statusAttestation: string;
  credentialType: SupportedCredentials;
};

/**
 * Thunk to obtain a new credential.
 * @param args.idPhint- The idPhint for the Identity Provider to use if the requested credential is a `PersonIdentificationData`
 * @param args.credentialType - The type of the requested credential to obtain
 * @returns The obtained credential result
 */
export const getCredentialThunk = createAppAsyncThunk<
  CredentialResult,
  GetCredentialThunkInput
>("credential/credentialGet", async (args, { getState }) => {
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
  /**
   * Obtains a new Wallet Instance Attestation.
   * WARNING: The integrity context must be the same used when creating the Wallet Instance with the same keytag.
   */
  const walletInstanceAttestation =
    await WalletInstanceAttestation.getAttestation({
      wiaCryptoContext,
      integrityContext,
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
      appFetch,
    });

  const { idpHint, credentialType } = args;
  if (idpHint && credentialType === "PersonIdentificationData") {
    return await getPid(
      idpHint,
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType
    );
  } else {
    // Get the PID from the store
    const pid = selectCredential("PersonIdentificationData")(getState());
    if (!pid) {
      throw new Error("PID not found");
    }
    const pidCryptoContext = createCryptoContextFor(pid.keyTag);
    return await getCredential(
      credentialType,
      walletInstanceAttestation,
      wiaCryptoContext,
      pid.credential,
      pidCryptoContext
    );
  }
});

/**
 * Thunk to obtain a credential status attestation.
 * @param args.credentialType - TThe type of credential for which you want to obtain the status attestation.
 * @returns The obtained credential result
 */
export const getCredentialStatusAttestationThunk = createAppAsyncThunk<
  GetCredentialStatusAttestationThunkOutput,
  GetCredentialStatusAttestationThunkInput
>("credential/statusAttestationGet", async (args) => {
  const { credential, keyTag, credentialType } = args;

  // Create credential crypto context
  const credentialCryptoContext = createCryptoContextFor(keyTag);

  // Start the issuance flow
  const startFlow: Credential.Status.StartFlow = () => ({
    issuerUrl: WALLET_EAA_PROVIDER_BASE_URL,
  });

  const { issuerUrl } = startFlow();

  // Evaluate issuer trust
  const { issuerConf } = await Credential.Status.evaluateIssuerTrust(issuerUrl);

  const res = await Credential.Status.statusAttestation(
    issuerConf,
    credential,
    credentialCryptoContext
  );
  return {
    statusAttestation: res.status_attestation,
    credentialType,
  };
});
