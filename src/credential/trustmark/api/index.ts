import type { CryptoContext } from "@pagopa/io-react-native-jwt";

export type GetCredentialTrustmarkJwt = (params: {
  /**
   * The Wallet Instance's attestation
   */
  walletInstanceAttestation: string;
  /**
   * The Wallet Instance's crypto context associated with the walletInstanceAttestation parameter
   */
  wiaCryptoContext: CryptoContext;
  /**
   * The type of credential for which the trustmark is generated
   */
  credentialType: string;
  /**
   * (Optional) Document number contained in the credential, if applicable
   */
  docNumber?: string;
  /**
   * (Optional) Expiration time for the trustmark, default is 2 minutes.
   * If a number is provided, it is interpreted as a timestamp in seconds.
   * If a string is provided, it is interpreted as a time span and added to the current timestamp.
   */
  expirationTime?: number | string;
}) => Promise<{
  /**
   * The signed JWT
   */
  jwt: string;
  /**
   * The expiration time of the JWT in seconds
   */
  expirationTime: number;
}>;

export interface TrustmarkApi {
  /**
   * Generates a trustmark signed JWT, which is used to verify the authenticity of a credential.
   * The public key used to sign the trustmark must the same used for the Wallet Instance Attestation.
   *
   * @since 1.0.0
   *
   * @throws {IoWalletError} If the WIA is expired
   * @throws {IoWalletError} If the public key associated to the WIA is not the same for the CryptoContext
   * @throws {JWSSignatureVerificationFailed} If the WIA signature is not valid
   * @returns A promise containing the signed JWT and its expiration time in seconds
   */
  getCredentialTrustmark: GetCredentialTrustmarkJwt;
}
