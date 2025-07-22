import { decode } from "../sd-jwt";
import { thumbprint } from "@pagopa/io-react-native-jwt";
import type { Out } from "./misc";
import type { ObtainCredential } from "../credential/issuance";
import type { JWK } from "./jwk";
import { IoWalletError } from "./errors";

const SD_JWT = ["vc+sd-jwt", "dc+sd-jwt"];

/**
 * Extracts a JWK from a credential.
 * @param credential - The credential string, which can be in SD-JWT or CBOR format.
 * @param format - The format of the credential
 * @return A Promise that resolves to a JWK object if the credential is in SD-JWT format and contains a JWK, or undefined otherwise.
 */
export const extractJwkFromCredential = async (
  credential: Out<ObtainCredential>["credential"],
  format: Out<ObtainCredential>["format"]
): Promise<JWK> => {
  if (SD_JWT.includes(format)) {
    // 1. SD-JWT case
    const decoded = decode(credential);
    const jwk = decoded.sdJwt.payload.cnf.jwk;
    if (jwk) {
      return { ...jwk, kid: await thumbprint(jwk) };
    }
  }
  throw new IoWalletError(`Credential format ${format} not supported`);
};
