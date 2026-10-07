/**
 * Type returned by the getHardwareSignatureWithAuthData function of {@link IntegrityContext}.
 * It contains the signature and the authenticator data.
 */
export interface HardwareSignatureWithAuthData {
  authenticatorData: string;
  signature: string;
}

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
