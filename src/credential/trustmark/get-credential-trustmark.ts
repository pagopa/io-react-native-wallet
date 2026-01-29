import {
  SignJWT,
  thumbprint,
  type CryptoContext,
  decode as decodeJwt,
} from "@pagopa/io-react-native-jwt";
import * as WalletInstanceAttestation from "../../wallet-instance-attestation/v1.0.0/utils";
import { IoWalletError } from "../../utils/errors";
import { obfuscateString } from "../../utils/string";
import { LogLevel, Logger } from "../../utils/logging";

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

/**
 * Generates a trustmark signed JWT, which is used to verify the authenticity of a credential.
 * The public key used to sign the trustmark must the same used for the Wallet Instance Attestation.
 *
 * @param walletInstanceAttestation the Wallet Instance's attestation
 * @param wiaCryptoContext The Wallet Instance's crypto context associated with the walletInstanceAttestation parameter
 * @param credentialType The type of credential for which the trustmark is generated
 * @param docNumber (Optional) Document number contained in the credential, if applicable
 * @param expirationTime (Optional) Expiration time for the trustmark, default is 2 minutes.
 *                        If a number is provided, it is interpreted as a timestamp in seconds.
 *                        If a string is provided, it is interpreted as a time span and added to the current timestamp.
 * @throws {IoWalletError} If the WIA is expired
 * @throws {IoWalletError} If the public key associated to the WIA is not the same for the CryptoContext
 * @throws {JWSSignatureVerificationFailed} If the WIA signature is not valid
 * @returns A promise containing the signed JWT and its expiration time in seconds
 */
export const getCredentialTrustmark: GetCredentialTrustmarkJwt = async ({
  walletInstanceAttestation,
  wiaCryptoContext,
  credentialType,
  docNumber,
  expirationTime = "2m",
}) => {
  /**
   * Check that the public key used to sign the trustmark is the one used for the WIA
   */
  const holderBindingKey = await wiaCryptoContext.getPublicKey();
  const decodedWia = WalletInstanceAttestation.decodeJwt(
    walletInstanceAttestation
  );

  Logger.log(
    LogLevel.DEBUG,
    `Decoded wia ${JSON.stringify(decodedWia.payload)} with holder binding key ${JSON.stringify(holderBindingKey)}`
  );

  /**
   * Check that the WIA is not expired
   */
  if (decodedWia.payload.exp * 1000 < Date.now()) {
    Logger.log(
      LogLevel.ERROR,
      `Wallet Instance Attestation expired with exp: ${decodedWia.payload.exp}`
    );
    throw new IoWalletError("Wallet Instance Attestation expired");
  }

  /**
   * Verify holder binding by comparing thumbprints of the WIA and the CryptoContext key
   */
  const wiaThumbprint = await thumbprint(decodedWia.payload.cnf.jwk);
  const cryptoContextThumbprint = await thumbprint(holderBindingKey);

  if (wiaThumbprint !== cryptoContextThumbprint) {
    Logger.log(
      LogLevel.ERROR,
      `Failed to verify holder binding for status attestation, expected thumbprint: ${cryptoContextThumbprint}, got: ${wiaThumbprint}`
    );
    throw new IoWalletError(
      `Failed to verify holder binding for status attestation, expected thumbprint: ${cryptoContextThumbprint}, got: ${wiaThumbprint}`
    );
  }

  Logger.log(
    LogLevel.DEBUG,
    `Wia thumbprint: ${wiaThumbprint} CryptoContext thumbprint: ${cryptoContextThumbprint}`
  );

  /**
   * Generate Trustmark signed JWT
   */
  const signedTrustmarkJwt = await new SignJWT(wiaCryptoContext)
    .setProtectedHeader({
      alg: "ES256",
    })
    .setPayload({
      iss: walletInstanceAttestation,
      /**
       * If present, the document number is obfuscated before adding it to the payload
       */
      ...(docNumber ? { sub: obfuscateString(docNumber) } : {}),
      subtyp: credentialType,
    })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign();

  const decodedTrustmark = decodeJwt(signedTrustmarkJwt);

  return {
    jwt: signedTrustmarkJwt,
    expirationTime: decodedTrustmark.payload.exp ?? 0,
  };
};
