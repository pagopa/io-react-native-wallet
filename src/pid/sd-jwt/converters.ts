import { getValueFromDisclosures } from "../../sd-jwt/converters";
import type { Disclosure, SdJwt4VC } from "../../sd-jwt/types";
import { PID } from "./types";

export function pidFromToken(sdJwt: SdJwt4VC, disclosures: Disclosure[]): PID {
  return PID.parse({
    issuer: sdJwt.payload.iss,
    issuedAt: new Date(sdJwt.payload.iat * 1000),
    expiration: new Date(sdJwt.payload.exp * 1000),
    verification: {
      trustFramework:
        sdJwt.payload.verified_claims.verification.trust_framework,
      assuranceLevel:
        sdJwt.payload.verified_claims.verification.assurance_level,
      evidence: getValueFromDisclosures(disclosures, "evidence"),
    },
    claims: {
      uniqueId: getValueFromDisclosures(disclosures, "unique_id"),
      givenName: getValueFromDisclosures(disclosures, "given_name"),
      familyName: getValueFromDisclosures(disclosures, "family_name"),
      birthdate: getValueFromDisclosures(disclosures, "birthdate"),
      placeOfBirth: getValueFromDisclosures(disclosures, "place_of_birth"),
      taxIdCode: getValueFromDisclosures(disclosures, "tax_id_number"),
    },
  });
}
