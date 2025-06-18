import { decode } from "../sd-jwt";
import { CBOR } from "@pagopa/io-react-native-cbor";
import { thumbprint } from "@pagopa/io-react-native-jwt";

export const extractJwkFromCredential = async (credential: string) => {
  if (credential.includes("~")) {
    const parsed = decode(credential);
    const jwk = parsed.sdJwt.payload.cnf.jwk;
    if (jwk) {
      return { ...jwk, kid: await thumbprint(jwk) };
    }
  }

  // 2. CBOR case
  const decoded = await CBOR.decode(credential);
  const jwk = decoded?.credentialSubject?.cnf?.jwk;
  if (jwk) {
    return { ...jwk, kid: await thumbprint(jwk) };
  }
};
