import { decode } from "..";
import { disclose } from "../../../sd-jwt";

const sdjwt =
  "eyJraWQiOiItRl82VWdhOG4zVmVnalkyVTdZVUhLMXpMb2FELU5QVGM2M1JNSVNuTGF3IiwidHlwIjoidmMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJfc2QiOlsiNmxmdUEyY2xrLXJpaGJGZkhCdDBOd0wwaFJQRXJ3cDZ2NFBTQVZLc24zSSIsIkFza2xIRzhlR0VXTkNXLXNQTEkzZnVLWkRsUVpjenlPTXprUE5KZG9DbnciLCJJVU01bVZzbzFOVjVqcUh4OE4wUWJXb09aNWlVQzN4eDM3RThrMHVDR2gwIiwiUkMyMGVEbmFpZHI1N2dZd0hLRDc4bUxTWEFqUkIzemZZNUM4QkZXX1RyWSIsIlNPb1dFU1RyYjJScHRNMTZTcnVoWFRaaFlxS0lpclI0Z3JYQlMzVTdQUkUiLCJUWEdla0g4cVl0QjNLLVBmVHZOSlFVOURFMk1JNGhHc05XY2REcHQyZm04Il0sInN1YiI6ImU3YzJlOTRjLWY3NDEtNGZmZS1hNjY4LTQ2ZWI3NDIxODNjYSIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwiaXNzIjoiaHR0cHM6Ly9wcmUuZWlkLndhbGxldC5pcHpzLml0IiwiY25mIjp7Imp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2Iiwia2lkIjoiekV2X3FHU0w1cjBfRjY3ajJkd0VnVUptQmdiTU5TRUo1S19pSDFQWWM3QSIsIngiOiIwUGo3dl9hZk5wOUVUSngxMUpiWWdrSTd5UXBkMHJ0aVl1bzVmZXVBTjJvIiwieSI6IlhCNjJVbTAydkhxZWRrT3pTZko1aGR0alB6LXptVjlqbVdoNHNLZ2REOW8ifX0sImV4cCI6MTc1MTEwNzI1NSwic3RhdHVzIjp7InN0YXR1c19hdHRlc3RhdGlvbiI6eyJjcmVkZW50aWFsX2hhc2hfYWxnIjoic2hhLTI1NiJ9fX0.1D871Dsx3hyv1-dRclyyW_kI5NOJlz33QZenJotGdNBbXe6-q-MaJ0HfibjAaGWBa98KvQADqiqkd3tHufpR_w";

const disclosures = [
  "WyJybVRCMjBWc3JyY2p0NHdEMURTNUpBIiwiYmlydGhkYXRlIiwiMTk4NS0xMi0xMCJd",
  "WyJTaU5EX2VycjVPQU9ObGJwUHE5NC1nIiwidW5pcXVlX2lkIiwiVElOSVQtTFZMREFBODVUNTBHNzAyQiJd",
  "WyJEUS16QVVfekYtQnUyakxJYWJBTENBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1MVkxEQUE4NVQ1MEc3MDJCIl0",
  "WyJ6X0Y2Q2hJTDRMTlQxUTRrcms1cC1BIiwiZ2l2ZW5fbmFtZSIsIkFkYSJd",
  "WyI5M1YyS1lvMW1hNlNPVmRmTzd3VGRRIiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd",
  "WyJ5ejdQOW5haFlGLXYtU2pXc0g0VC13IiwiaWF0IiwxNzE5NTcxMjU0XQ",
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
      expiration: new Date(1751107255000),
      issuedAt: new Date(1719571254000),
      claims: {
        uniqueId: "TINIT-LVLDAA85T50G702B",
        givenName: "Ada",
        familyName: "Lovelace",
        birthdate: "1985-12-10",
        taxIdCode: "TINIT-LVLDAA85T50G702B",
      },
    });
  });

  it("should return a valid pid", async () => {
    const result = decode(token);

    expect(result.pid).toEqual({
      issuer: "https://pre.eid.wallet.ipzs.it",
      issuedAt: new Date(1719571254000),
      expiration: new Date(1751107255000),
      claims: {
        uniqueId: "TINIT-LVLDAA85T50G702B",
        givenName: "Ada",
        familyName: "Lovelace",
        birthdate: "1985-12-10",
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
      "birthdate",
      "tax_id_code",
      "iat",
    ]);

    const expected = {
      token,
      paths: [
        { claim: "unique_id", path: "verified_claims.claims._sd[1]" },
        { claim: "given_name", path: "verified_claims.claims._sd[5]" },
        { claim: "family_name", path: "verified_claims.claims._sd[4]" },
        { claim: "birthdate", path: "verified_claims.claims._sd[2]" },
        { claim: "tax_id_code", path: "verified_claims.claims._sd[0]" },
        { claim: "iat", path: "verified_claims.claims._sd[3]" },
      ],
    };

    expect(result).toEqual(expected);
  });
});
