import { Base64 } from "js-base64";
import { sha256 } from "js-sha256";

/**
 * Return the base64url (unpadded) encoded SHA256 hash of the UTF-8 encoded input string.
 */
export const sha256ToBase64Url = async (toHash: string) =>
  Base64.fromUint8Array(new Uint8Array(sha256.arrayBuffer(toHash)), true);
