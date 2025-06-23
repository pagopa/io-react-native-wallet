import { decode } from "..";
import { disclose } from "../../../sd-jwt";

const sdjwt =
  "eyJraWQiOiItRl82VWdhOG4zVmVnalkyVTdZVUhLMXpMb2FELU5QVGM2M1JNSVNuTGF3IiwidHlwIjoiZGMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJfc2QiOlsiMHExRDVKbWF2NnBRYUVoX0pfRmN2X3VOTk1RSWdDeWhRT3hxbFk0bDNxVSIsIktDSi1BVk52ODhkLXhqNnNVSUFPSnhGbmJVaDNySFhES2tJSDFsRnFiUnMiLCJNOWxvOVl4RE5JWHJBcTJxV2VpQ0E0MHpwSl96WWZGZFJfNEFFQUxjUnRVIiwiY3pnalVrMG5xUkNzd1NoQ2hDamRTNkExLXY0N2RfcVRDU0ZJdklIaE1vSSIsIm5HblFyN2NsbTN0ZlRwOHlqTF91SHJEU090elIyUFZiOFM3R2VMZEFxQlEiLCJ4TklWd2xwU3NhWjhDSlNmMGd6NXhfNzVWUldXYzZWMW1scGVqZENycVVzIl0sInN1YiI6IjIxNmY4OTQ2LTllY2ItNDgxOS05MzA5LWMwNzZmMzRhN2UxMSIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwidmN0I2ludGVncml0eSI6IjEzZTI1ODg4YWM3YjhhM2E2ZDYxNDQwZGE3ODdmY2NjODE2NTRlNjEwODU3MzJiY2FjZDg5YjM2YWVjMzI2NzUiLCJpc3MiOiJodHRwczovL3ByZS5laWQud2FsbGV0LmlwenMuaXQiLCJpc3N1aW5nX2NvdW50cnkiOiJJVCIsImlzc3VpbmdfYXV0aG9yaXR5IjoiSXN0aXR1dG8gUG9saWdyYWZpY28gZSBaZWNjYSBkZWxsbyBTdGF0byIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsImtpZCI6IlJ2M1ctRWlLcHZCVHlrNXlaeHZyZXYtN01EQjZTbHpVQ0JvX0NRampkZFUiLCJ4IjoiMFdveDdRdHlQcUJ5ZzM1TUhfWHlDY25kNUxlLUptMEFYSGxVZ0RCQTAzWSIsInkiOiJlRWhWdmcxSlBxTmQzRFRTYTRtR0RHQmx3WTZOUC1FWmJMYk5GWFNYd0lnIn19LCJleHAiOjE3NTE1NDY1NzYsInN0YXR1cyI6eyJzdGF0dXNfYXNzZXJ0aW9uIjp7ImNyZWRlbnRpYWxfaGFzaF9hbGciOiJzaGEtMjU2In19fQ.XqB-0BJmBr5vwahsbsnE5oqrlxzvxHc-k2NZX93Z_gNMIj4ZqKe7g03r40VnbpfLd2exofd_XZRKtqF_EkFfZA";

const disclosures = [
  "WyJrSkRFUDhFYU5URU1CRE9aelp6VDR3IiwidW5pcXVlX2lkIiwiVElOSVQtTFZMREFBODVUNTBHNzAyQiJd",
  "WyJ6SUF5VUZ2UGZJcEUxekJxeEk1aGFRIiwiYmlydGhfZGF0ZSIsIjE5ODUtMTItMTAiXQ",
  "WyJHcjNSM3MyOTBPa1FVbS1ORlR1OTZBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1MVkxEQUE4NVQ1MEc3MDJCIl0",
  "WyJHeE9SYWxNQWVsZlowZWRGSmpqWVV3IiwiZ2l2ZW5fbmFtZSIsIkFkYSJd",
  "WyJfdlY1UklrbDBJT0VYS290czlrdDF3IiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd",
  "WyJDajV0Y2NSNzJKd3J6ZTJUVzRhLXdnIiwiaWF0IiwxNzIwMDEwNTc1XQ",
];

const token = [sdjwt, ...disclosures].join("~");

describe("decode", () => {
  it("should return pid, sd-jwt and disclosures", async () => {
    const result = decode(token);

    // check shallow shape
    expect(result).toEqual(
      expect.objectContaining({
        pid: expect.any(Object),
        sdJwt: expect.any(Object),
        disclosures: expect.any(Array),
      })
    );
    // check pid in deep
    expect(result.pid).toEqual({
      issuer: "https://pre.eid.wallet.ipzs.it",
      expiration: new Date(1751546576000),
      issuedAt: new Date(1720010575000),
      claims: {
        uniqueId: "TINIT-LVLDAA85T50G702B",
        givenName: "Ada",
        familyName: "Lovelace",
        birthDate: "1985-12-10",
        taxIdCode: "TINIT-LVLDAA85T50G702B",
      },
    });
  });

  it("should return a valid pid", async () => {
    const result = decode(token);

    expect(result.pid).toEqual({
      issuer: "https://pre.eid.wallet.ipzs.it",
      issuedAt: new Date(1720010575000),
      expiration: new Date(1751546576000),
      claims: {
        uniqueId: "TINIT-LVLDAA85T50G702B",
        givenName: "Ada",
        familyName: "Lovelace",
        birthDate: "1985-12-10",
        taxIdCode: "TINIT-LVLDAA85T50G702B",
      },
    });
  });
});

describe("disclose", () => {
  it("should return pid, sd-jwt and disclosures", async () => {
    const result = await disclose(token, [
      "unique_id",
      "given_name",
      "family_name",
      "birth_date",
      "tax_id_code",
      "iat",
    ]);

    const expected = {
      token,
      paths: [
        { claim: "unique_id", path: "verified_claims.claims._sd[1]" },
        { claim: "given_name", path: "verified_claims.claims._sd[3]" },
        { claim: "family_name", path: "verified_claims.claims._sd[0]" },
        { claim: "birth_date", path: "verified_claims.claims._sd[5]" },
        { claim: "tax_id_code", path: "verified_claims.claims._sd[2]" },
        { claim: "iat", path: "verified_claims.claims._sd[4]" },
      ],
    };

    expect(result).toEqual(expected);
  });
});
