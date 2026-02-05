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
