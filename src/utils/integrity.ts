export interface IntegrityContext {
  getHardwareKeyTag: () => string;
  getAttestation: (nonce: string) => Promise<string>;
  getHardwareSignatureWithAuthData: (
    clientData: string
  ) => Promise<HardwareSignatureWithAuthData>;
}

export type HardwareSignatureWithAuthData = {
  signature: string;
  authenticatorData: string;
};
