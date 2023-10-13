export type StartFlow = () => Promise<{
  issuerUrl: string;
  credentialType: string;
}>;
