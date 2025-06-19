import { decode } from "../sd-jwt";
import { CBOR } from "@pagopa/io-react-native-cbor";
import { thumbprint } from "@pagopa/io-react-native-jwt";
import type { Out } from "./misc";
import type { ObtainCredential } from "../credential/issuance";

/**
 * Extracts a JWK from a credential.
 * @param credential - The credential string, which can be in SD-JWT or CBOR format.
 * @param format - The format of the credential, either "vc+sd-jwt" or "vc+mdoc-cbor".
 */
export const extractJwkFromCredential = async (
  credential: Out<ObtainCredential>["credential"],
  format: Out<ObtainCredential>["format"]
) => {
  if (format === "vc+sd-jwt") {
    // 1. SD-JWT case
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
