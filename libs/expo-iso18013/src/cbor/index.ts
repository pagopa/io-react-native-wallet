import type { PublicKey } from "@pagopa/io-react-native-crypto";

import { requireNativeModule } from "expo";

type NativeCbor = {
  decode(data: string): Promise<string>;
  decodeDocuments(data: string): Promise<string>;
  decodeIssuerSigned(data: string): Promise<string>;
  sign(data: string, keyTag: string): Promise<string>;
  verify(data: string, publicKey: PublicKey): Promise<boolean>;
};

export const IoReactNativeCbor =
  requireNativeModule<NativeCbor>("ExpoIso18013Cbor");
