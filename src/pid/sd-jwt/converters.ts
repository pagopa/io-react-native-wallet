import { getValueFromDisclosures } from "../../sd-jwt/converters";
import type { Disclosure, SdJwt4VC } from "../../sd-jwt/types";
import { PID } from "./types";

export function pidFromToken(sdJwt: SdJwt4VC, disclosures: Disclosure[]): PID {
  const placeOfBirth = getValueFromDisclosures(disclosures, "place_of_birth");
  return PID.parse({
    issuer: sdJwt.payload.iss,
    issuedAt: new Date(getValueFromDisclosures(disclosures, "iat") * 1000),
    expiration: new Date(sdJwt.payload.exp * 1000),
    claims: {
      uniqueId: getValueFromDisclosures(disclosures, "unique_id"),
      givenName: getValueFromDisclosures(disclosures, "given_name"),
      familyName: getValueFromDisclosures(disclosures, "family_name"),
      birthDate: getValueFromDisclosures(disclosures, "birth_date"),
      ...(placeOfBirth && placeOfBirth),
      taxIdCode: getValueFromDisclosures(disclosures, "tax_id_code"),
    },
  });
}
