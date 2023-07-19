import { encodeBase64, sha256ToBase64 } from "@pagopa/io-react-native-jwt";

import { ValidationFailed } from "../utils/errors";
import type { Disclosure, ObfuscatedDisclosures } from "./types";

export const verifyDisclosure = async (
  disclosure: Disclosure,
  claims: ObfuscatedDisclosures["_sd"]
) => {
  let disclosureString = JSON.stringify(disclosure);
  let encodedDisclosure = encodeBase64(disclosureString);
  let hash = await sha256ToBase64(encodedDisclosure);
  if (!claims.includes(hash)) {
    throw new ValidationFailed(
      "Validation of disclosure failed",
      `${disclosure}`,
      "Disclosure hash not found in claims"
    );
  }
};
