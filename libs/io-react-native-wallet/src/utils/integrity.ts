/**
 * Type returned by the getHardwareSignatureWithAuthData function of {@link IntegrityContext}.
 * It contains the signature and the authenticator data.
 * authenticatorData: the iOS assertion or the Android Play Integrity token. On Android it can be missing
 * when Google Play Services is not available, e.g. on devices running GrapheneOS.
 * hardwareKeyAttestation: ANDROID ONLY, a fresh key attestation generated with the SHA-256 hex digest of the
 * client data as challenge. The Wallet Provider verifies it as fallback when the Play Integrity token is missing
 * or not valid, following the GrapheneOS attestation compatibility guide.
 */
export interface HardwareSignatureWithAuthData {
  authenticatorData?: string;
  hardwareKeyAttestation?: string;
  signature: string;
}

/**
 * Maps the integrity proofs of {@link HardwareSignatureWithAuthData} to the claims of a Wallet Provider request,
 * omitting the missing ones.
 * @param hardwareSignatureWithAuthData The integrity proofs.
 * @returns The integrity_assertion and hardware_key_attestation claims, when available.
 */
export const toIntegrityClaims = ({
  authenticatorData,
  hardwareKeyAttestation,
}: HardwareSignatureWithAuthData) => ({
  ...(authenticatorData && { integrity_assertion: authenticatorData }),
  ...(hardwareKeyAttestation && {
    hardware_key_attestation: hardwareKeyAttestation,
  }),
});

/**
 * Interface for the integrity context which provides the necessary functions to interact with the integrity service.
 * The functions are platform specific and must be implemented in the platform specific code.
 * getHardwareKeyTag: returns the hardware key tag in a url safe format (e.g. base64url).
 * getAttestation: requests the attestation from the integrity service.
 * getHardwareSignatureWithAuthData: signs the clientData and returns the signature with the authenticator data.
 */
export interface IntegrityContext {
  getAttestation: (nonce: string) => Promise<string>;
  getHardwareKeyTag: () => string;
  getHardwareSignatureWithAuthData: (
    clientData: string,
  ) => Promise<HardwareSignatureWithAuthData>;
}
