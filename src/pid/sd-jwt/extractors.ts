import type { Disclosure } from "../../sd-jwt/types";
import type { PidSdJwt4VC } from "./types";

/**
 * This function extracts disclosures from the body of a PidSdJwtVC sd-jwt
 * @param sdJwt A {@link PidSdJwt4VC} from which the new disclosures will be extracted
 * @returns
 */
export const pidSdJwtDisclosureExtractor = (
  sdJwt: PidSdJwt4VC
): Disclosure[] => {
  return [
    ["unused", "expiry_date", sdJwt.payload.expiry_date],
    ["unused", "issuing_country", sdJwt.payload.issuing_country],
    ["unused", "issuing_authority", sdJwt.payload.issuing_authority],
  ];
};
