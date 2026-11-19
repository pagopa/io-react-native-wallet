import { Base64 } from "js-base64";
import { sha256 } from "js-sha256";

import { IoWalletError } from "./errors";

/**
 * Return the base64url (unpadded) encoded SHA256 hash of the UTF-8 encoded input string.
 */
export const sha256ToBase64Url = (toHash: string) =>
  Base64.fromUint8Array(new Uint8Array(sha256.arrayBuffer(toHash)), true);

/**
 * Get the hash of a credential without disclosures.
 * A credential is a string like `header.body.sign~sd1~sd2....` where `~` is the separator between the credential and the disclosures.
 * @param credential - The credential to hash
 * @returns The hex encoded SHA256 hash of the credential without disclosures
 */
export const getCredentialHashWithoutDisclosures = (credential: string) => {
  const tildeIndex = credential.indexOf("~");
  if (tildeIndex === -1) {
    throw new IoWalletError("Invalid credential format");
  }
  return sha256(credential.slice(0, tildeIndex));
};
