import { decodeSdJwtSync } from "@sd-jwt/decode";
import { digest } from "@sd-jwt/crypto-nodejs";
import { thumbprint } from "@pagopa/io-react-native-jwt";
import type { CredentialFormat } from "../credential/issuance";
import type { JWK } from "./jwk";
import { IoWalletError } from "./errors";
import {
  LEGACY_SD_JWT,
  SdJwt4VCBase,
  type SupportedSdJwtLegacyFormat,
} from "../sd-jwt/types";

const SD_JWT = ["dc+sd-jwt", LEGACY_SD_JWT];

/**
 * Extracts a JWK from a credential.
 * @param credential - The credential string, which can be in SD-JWT or CBOR format.
 * @param format - The format of the credential
 * @return A Promise that resolves to a JWK object if the credential is in SD-JWT format and contains a JWK, or undefined otherwise.
 */
export const extractJwkFromCredential = async (
  credential: string,
  format: CredentialFormat | SupportedSdJwtLegacyFormat
): Promise<JWK> => {
  if (SD_JWT.includes(format)) {
    // 1. SD-JWT case
    const decoded = decodeSdJwtSync(
      fixLegacyCredentialSdJwt(credential),
      digest
    );
    const { cnf } = decoded.jwt.payload as SdJwt4VCBase["payload"];
    if (cnf.jwk) {
      return { ...cnf.jwk, kid: await thumbprint(cnf.jwk) };
    }
  }
  throw new IoWalletError(`Credential format ${format} not supported`);
};

/**
 * Legacy credentials do not end with `~`. This function adds `~` when needed
 * to avoid decoding errors in the @sd-jwt libraries.
 */
export const fixLegacyCredentialSdJwt = (token: string) => {
  if (!token.endsWith("~")) {
    const hasKeyBindingJwt = token.split("~").at(-1)?.split(".").length === 3;
    // Either we have a key binding JWT or it is a legacy 0.7.1 credential
    return hasKeyBindingJwt ? token : `${token}~`;
  }
  return token;
};
