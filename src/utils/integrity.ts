import type { PublicKey } from "@pagopa/io-react-native-crypto";
import type { JWK } from "./jwk";

export interface IntegrityContext {
  getHardwareKeyTag: () => string;
  getHardwarePublicKey: () => Promise<JWK>;
  getAttestation: (nonce: string) => Promise<string>;
  getHardwareSignatureWithAuthData: (
    clientData: string
  ) => Promise<{ signature: string; authenticatorData: string }>;
}
