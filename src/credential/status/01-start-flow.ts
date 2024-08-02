/**
 * WARNING: This is the first function to be called in the status attestation flow. The next function to be called is {@link statusAttestation}.
 * The beginning of the status attestation flow.
 *
 * @returns The url of the credential issuer to be used in the next function.
 */
export type StartFlow = () => {
  issuerUrl: string;
};
