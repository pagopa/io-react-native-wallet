import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";
import { IoWalletError } from "../../utils/errors";
import { obfuscateString } from "../../utils/string";

export type GetCredentialTrustmarkJwt = (
  walletInstanceAttestation: string,
  wiaCryptoContext: CryptoContext,
  credentialType: string,
  documentNumber?: string
) => Promise<string>;

/**
 * Generates a trustmark signed JWT, which is used to verify the authenticity of a credential.
 *
 * @param walletInstanceAttestation the Wallet Instance's attestation
 * @param wiaCryptoContext The Wallet Instance's crypto context associated with the walletInstanceAttestation parameter
 * @param credentialType The type of credential for which the trustmark is generated
 * @param documentNumber (Optional) Document number contained in the credential, if applicable
 * @returns A promise that resolves to the signed JWT string, representing the credential's trustmark.
 */
export const getCredentialTrustmarkJwt: GetCredentialTrustmarkJwt = async (
  walletInstanceAttestation,
  wiaCryptoContext,
  credentialType,
  documentNumber
): Promise<string> => {
  /**
   * Check that the public key used to sign the trustmark is the one used for the WIA
   */
  const holderBindingKey = await wiaCryptoContext.getPublicKey();
  const decodedWia = WalletInstanceAttestation.decode(
    walletInstanceAttestation
  );

  if (
    !decodedWia.payload.cnf.jwk.kid ||
    decodedWia.payload.cnf.jwk.kid !== holderBindingKey.kid
  ) {
    throw new IoWalletError(
      `Failed to verify holder binding for status attestation, expected kid: ${holderBindingKey.kid}, got: ${decodedWia.payload.cnf.jwk.kid}`
    );
  }

  /**
   * Obfuscate the document number before adding it to the payload
   */
  const obfuscatedDocumentNumber = documentNumber
    ? obfuscateString(documentNumber)
    : undefined;

  /**
   * Generate Trustmark signed JWT
   */
  const signedTrustmarkJwt = await new SignJWT(wiaCryptoContext)
    .setProtectedHeader({
      alg: "ES256",
    })
    .setPayload({
      iss: walletInstanceAttestation,
      sub: credentialType,
      subtyp: obfuscatedDocumentNumber,
    })
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign();

  return signedTrustmarkJwt;
};
