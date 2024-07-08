/**
 * WARNING: This is the first function to be called in the issuing flow. The next function to be called is {@link evaluateIssuerTrust}.
 * The beginning of the issuing flow.
 * To be implemented accordind to the user touchpoint
 *
 * @returns The type of the Credential to be issued and the url of the Issuer
 */
export type StartFlow = () => {
  issuerUrl: string;
  credentialType: string;
};
