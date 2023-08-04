import { sha256ToBase64 } from "@pagopa/io-react-native-jwt";

import { ValidationFailed } from "../utils/errors";
import type { DisclosureWithEncoded, ObfuscatedDisclosures } from "./types";

export const verifyDisclosure = async (
  { encoded, decoded }: DisclosureWithEncoded,
  claims: ObfuscatedDisclosures["_sd"]
) => {
  let hash = await sha256ToBase64(encoded);
  if (!claims.includes(hash)) {
    throw new ValidationFailed(
      "Validation of disclosure failed",
      `${decoded}`,
      "Disclosure hash not found in claims"
    );
  }
};
