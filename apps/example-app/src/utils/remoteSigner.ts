import type { Signer } from "@io-app-it-wallet/io-react-native-wallet";

import { thumbprint } from "@pagopa/io-react-native-jwt";

/**
 * Minimal contract of a remote WSCD / HSM SDK, as consumed by the example signer.
 * Any SDK exposing these operations can be plugged in via {@link createRemoteSignerFromSdk}.
 */
export interface RemoteWscdSdk {
  /** Returns the public key (JWK, without `kid`) of the remote key */
  getPublicKey: (keyId: string) => Promise<Omit<PublicJwk, "kid">>;
  /** Signs the value with the remote key and returns the signature */
  sign: (keyId: string, value: string) => Promise<string>;
}

type PublicJwk = Awaited<ReturnType<Signer["getPublicKey"]>>;

/**
 * Example of a remote {@link Signer} backed by a remote WSCD SDK.
 * The private key never leaves the HSM, so the signer is flagged as remote.
 *
 * @param sdk The remote WSCD SDK
 * @param keyId The identifier of the remote key (e.g. its KeyBlob reference)
 */
export const createRemoteSignerFromSdk = (
  sdk: RemoteWscdSdk,
  keyId: string,
): Signer => ({
  async getPublicKey() {
    const jwk = await sdk.getPublicKey(keyId);
    // Same convention as local signers: the KID is the thumbprint of the public key
    return { ...jwk, kid: await thumbprint(jwk) } as PublicJwk;
  },
  isRemote: true,
  sign: (value) => sdk.sign(keyId, value),
});
