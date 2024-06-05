/**
 * Interface for the integrity context which provides the necessary functions to interact with the integrity service.
 * The functions are platform specific and must be implemented in the platform specific code.
 * getHardwareKeyTag: returns the hardware key tag.
 * getAttestation: requests the attestation from the integrity service.
 * getHardwareSignatureWithAuthData: signs the clientData and returns the signature with the authenticator data.
 */
export interface IntegrityContext {
  getHardwareKeyTag: () => string;
  getAttestation: (nonce: string) => Promise<string>;
  getHardwareSignatureWithAuthData: (
    clientData: string
  ) => Promise<HardwareSignatureWithAuthData>;
}

/**
 * Type returned by the getHardwareSignatureWithAuthData function of {@link IntegrityContext}.
 * It contains the signature and the authenticator data.
 */
export type HardwareSignatureWithAuthData = {
  signature: string;
  authenticatorData: string;
};
