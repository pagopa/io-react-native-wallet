import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
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
  const obfuscatedDocumentNumber = documentNumber
    ? obfuscateString(documentNumber)
    : undefined;

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
