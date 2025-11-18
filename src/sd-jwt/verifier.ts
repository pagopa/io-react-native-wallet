import { sha256ToBase64 } from "@pagopa/io-react-native-jwt";

import { ValidationFailed } from "../utils/errors";
import type { DisclosureWithEncoded, ObfuscatedDisclosures } from "./types";

export const verifyDisclosure = async (
  { encoded, decoded }: DisclosureWithEncoded,
  claims: ObfuscatedDisclosures["_sd"]
) => {
  if (decoded.length === 2) {
    return;
  }
  let hash = await sha256ToBase64(encoded);
  if (!claims.includes(hash)) {
    throw new ValidationFailed({
      message: "Validation of disclosure failed",
      claim: `${decoded}`,
      reason: "Disclosure hash not found in claims",
    });
  }
};
