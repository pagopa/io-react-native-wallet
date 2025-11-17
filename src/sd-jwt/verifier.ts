import { sha256ToBase64 } from "@pagopa/io-react-native-jwt";

import { ValidationFailed } from "../utils/errors";
import type {
  Disclosure,
  DisclosureWithEncoded,
  ObfuscatedDisclosures,
} from "./types";

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

export async function reconstructDisclosures(
  disclosures: DisclosureWithEncoded[]
): Promise<DisclosureWithEncoded[]> {
  const result = [...disclosures];

  const hashMap = new Map<string, Disclosure>();
  for (const d of disclosures) {
    const h = await sha256ToBase64(d.encoded);
    hashMap.set(h, d.decoded);
  }

  return result.map((d) => {
    const decoded = d.decoded;

    if (decoded.length === 3 && Array.isArray(decoded[2])) {
      const arr = decoded[2].map((item) => {
        if (item && typeof item === "object" && item["..."]) {
          const innerHash = item["..."];
          const innerDec = hashMap.get(innerHash);
          if (!innerDec) return item;

          // ["salt", value]
          return innerDec.length === 2 ? innerDec[1] : innerDec[2];
        }
        return item;
      });

      return {
        ...d,
        decoded: [decoded[0], decoded[1], arr],
      };
    }

    return d;
  });
}
