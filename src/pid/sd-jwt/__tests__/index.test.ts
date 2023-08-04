import { decode } from "..";
import { disclose } from "../../../sd-jwt";

const sdjwt =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0cnVzdF9jaGFpbiI6W10sInR5cCI6InZjK3NkLWp3dCJ9.eyJzdWIiOiJMeExqRXJNUkd5cTRmb0ZCODh1TUxiVFQ2cS1rUHNITDhNTGktYloyUWRVIiwidmVyaWZpZWRfY2xhaW1zIjp7ImNsYWltcyI6eyJfc2QiOlsiSTllS2R6dk5oQWd1V3pGdFhPMmZiVUNaVWFoUDlwZkVaVXJaamhldGFEYyIsIm85OFVkeV90aVlvZzVJWFVibDVoMnJDSHhLYnljU1c0RDQ4Uno2V3JlejQiLCJaN3Fja1RnUjc0WjM2TFhtaDBXOFV0WkVka0Jta1pzUjVCTzRTenc3ZzY4IiwiMGswYTRoeXgyeWNHQVlITFFpMWJ4UU9MdnUzUUktdmNyYUZOLUFzX3VnMCIsIlZDV1NpY2w4cWcyUEcxN0VTSFN3NVBMdEFCdldYTy1oakR1TURuME5KTjQiLCI1QWJKOVlTRTR6TW9DTUZ6ZW4xMTV2QWtmSjJKc25qMVJ1WDVZb0ZkUzNJIl19LCJ2ZXJpZmljYXRpb24iOnsidHJ1c3RfZnJhbWV3b3JrIjoiZWlkYXMiLCJhc3N1cmFuY2VfbGV2ZWwiOiJoaWdoIiwiX3NkIjpbImZZZUVNcWE5WEFuQXQ0OFdmcVZlejQwSW1jVk1Jc1plYkp4a3F5TmlKcUEiXX19LCJfc2RfYWxnIjoic2hhLTI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsImNuZiI6eyJqd2siOnsiY3J2IjoiUC0yNTYiLCJrdHkiOiJFQyIsIngiOiJxckpyajNBZl9CNTdzYk9JUnJjQk03YnI3d09jOHluajdsSEZQVGVmZlVrIiwieSI6IjFIMGNXRHlHZ3ZVOHcta1BLVV94eWNPQ1VOVDJvMGJ3c2xJUXRuUFU2aU0iLCJraWQiOiI1dDVZWXBCaE4tRWdJRUVJNWlVenI2cjBNUjAyTG5WUTBPbWVrbU5LY2pZIn19LCJ0eXBlIjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwianRpIjoidXJuOnV1aWQ6YTQ0MmEzNDAtYjM4ZS00OWMzLTlkNDktZjc1OWY0MDgzMWU2Iiwic3RhdHVzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3N0YXR1cyIsImlhdCI6MTY4OTY5MzU1OSwiZXhwIjoyMDA1MjY5NTU5fQ.tpgf0oo0-RJxkL98ipw5xX3ftEmZw-fQVA2c2aM1gZ_jfcDXE2_Xs2aMpT0hy7w4IhP5V0B0HmXtTVYXwVu8kQ";

const disclosures = [
  "WyJyYzQ0Z3ZRUy1TNDFFUDhSVU1pdFRRIiwiZXZpZGVuY2UiLFt7InR5cGUiOiJlbGVjdHJvbmljX3JlY29yZCIsInJlY29yZCI6eyJ0eXBlIjoiZWlkYXMuaXQuY2llIiwic291cmNlIjp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiTWluaXN0ZXJvIGRlbGwnSW50ZXJubyIsIm9yZ2FuaXphdGlvbl9pZCI6Im1faXQiLCJjb3VudHJ5X2NvZGUiOiJJVCJ9fX1dXQ",
  "WyI2dzFfc29SWEZnYUhLZnBZbjNjdmZRIiwiZ2l2ZW5fbmFtZSIsIk1hcmlvIl0",
  "WyJoNlQ3MXIycVZmMjlsNXhCNnUzdWx3IiwiZmFtaWx5X25hbWUiLCJSb3NzaSJd",
  "WyJvR29iQl9uZXRZMEduS3hUN3hsVTRBIiwidW5pcXVlX2lkIiwiaWRBTlBSIl0",
  "WyJmdU5wOTdIZjN3VjZ5NDh5LVFaaElnIiwiYmlydGhkYXRlIiwiMTk4MC0xMC0wMSJd",
  "WyJwLTlMenlXSFpCVkR2aFhEV2tOMnhBIiwicGxhY2Vfb2ZfYmlydGgiLHsiY291bnRyeSI6IklUIiwibG9jYWxpdHkiOiJSb21lIn1d",
  "WyI5UnFLdWwzeHh6R2I4X1J1Zm5BSmZRIiwidGF4X2lkX251bWJlciIsIlRJTklULVJTU01SQTgwQTEwSDUwMUEiXQ",
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
      issuer: "http://localhost:8080",
      issuedAt: new Date(1689693559000),
      expiration: new Date(2005269559000),
      verification: {
        trustFramework: "eidas",
        assuranceLevel: "high",
        evidence: [
          {
            type: "electronic_record",
            record: {
              type: "eidas.it.cie",
              source: {
                organization_name: "Ministero dell'Interno",
                organization_id: "m_it",
                country_code: "IT",
              },
            },
          },
        ],
      },
      claims: {
        uniqueId: "idANPR",
        givenName: "Mario",
        familyName: "Rossi",
        birthdate: "1980-10-01",
        placeOfBirth: { country: "IT", locality: "Rome" },
        taxIdCode: "TINIT-RSSMRA80A10H501A",
      },
    });
  });

  it("should return a valid pid", async () => {
    const result = decode(token);

    expect(result.pid).toEqual({
      issuer: "http://localhost:8080",
      issuedAt: new Date(1689693559000),
      expiration: new Date(2005269559000),
      verification: {
        trustFramework: "eidas",
        assuranceLevel: "high",
        evidence: [
          {
            type: "electronic_record",
            record: {
              type: "eidas.it.cie",
              source: {
                organization_name: "Ministero dell'Interno",
                organization_id: "m_it",
                country_code: "IT",
              },
            },
          },
        ],
      },
      claims: {
        uniqueId: "idANPR",
        givenName: "Mario",
        familyName: "Rossi",
        birthdate: "1980-10-01",
        placeOfBirth: { country: "IT", locality: "Rome" },
        taxIdCode: "TINIT-RSSMRA80A10H501A",
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
      "birthdate",
      "place_of_birth",
      "tax_id_number",
      "evidence",
    ]);

    const expected = {
      token,
      paths: [
        { claim: "unique_id", path: "verified_claims.claims._sd[2]" },
        { claim: "given_name", path: "verified_claims.claims._sd[0]" },
        { claim: "family_name", path: "verified_claims.claims._sd[1]" },
        { claim: "birthdate", path: "verified_claims.claims._sd[3]" },
        { claim: "place_of_birth", path: "verified_claims.claims._sd[4]" },
        { claim: "tax_id_number", path: "verified_claims.claims._sd[5]" },
        { claim: "evidence", path: "verified_claims.verification._sd[0]" },
      ],
    };

    expect(result).toEqual(expected);
  });
});
