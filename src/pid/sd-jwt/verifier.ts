import { encodeBase64, sha256ToBase64 } from "@pagopa/io-react-native-jwt";
import type { Disclosure, ObfuscatedDisclosures } from "./types";
import { PIDValidationFailed } from "./../../utils/errors";

export const verifyDisclosure = async (
  disclosure: Disclosure,
  claims: ObfuscatedDisclosures["_sd"]
) => {
  let disclosureString = JSON.stringify(disclosure);
  let encodedDisclosure = encodeBase64(disclosureString);
  let hash = await sha256ToBase64(encodedDisclosure);
  if (!claims.includes(hash)) {
    throw new PIDValidationFailed(
      "Validation of disclosure failed",
      `${disclosure}`,
      "Disclosure hash not found in claims"
    );
  }
};
