import { decode } from "..";

const sdjwt =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0cnVzdF9jaGFpbiI6W10sInR5cCI6InZjK3NkLWp3dCJ9.eyJzdWIiOiJMeExqRXJNUkd5cTRmb0ZCODh1TUxiVFQ2cS1rUHNITDhNTGktYloyUWRVIiwidmVyaWZpZWRfY2xhaW1zIjp7ImNsYWltcyI6eyJfc2QiOlsiMnFwTS1SQ2hlR3ZaQUw1cHJDaHJaemtCa0VmQXNGREw4QXRZcVlrZ3UwayIsIjVBYko5WVNFNHpNb0NNRnplbjExNXZBa2ZKMkpzbmoxUnVYNVlvRmRTM0kiLCJJOWVLZHp2TmhBZ3VXekZ0WE8yZmJVQ1pVYWhQOXBmRVpVclpqaGV0YURjIiwiMGswYTRoeXgyeWNHQVlITFFpMWJ4UU9MdnUzUUktdmNyYUZOLUFzX3VnMCIsIlo3cWNrVGdSNzRaMzZMWG1oMFc4VXRaRWRrQm1rWnNSNUJPNFN6dzdnNjgiLCJvOThVZHlfdGlZb2c1SVhVYmw1aDJyQ0h4S2J5Y1NXNEQ0OFJ6NldyZXo0Il19LCJ2ZXJpZmljYXRpb24iOnsidHJ1c3RfZnJhbWV3b3JrIjoiZWlkYXMiLCJhc3N1cmFuY2VfbGV2ZWwiOiJoaWdoIiwiX3NkIjpbImZZZUVNcWE5WEFuQXQ0OFdmcVZlejQwSW1jVk1Jc1plYkp4a3F5TmlKcUEiXX19LCJfc2RfYWxnIjoic2hhLTI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsImNuZiI6eyJqd2siOnsiY3J2IjoiUC0yNTYiLCJrdHkiOiJFQyIsIngiOiJxckpyajNBZl9CNTdzYk9JUnJjQk03YnI3d09jOHluajdsSEZQVGVmZlVrIiwieSI6IjFIMGNXRHlHZ3ZVOHcta1BLVV94eWNPQ1VOVDJvMGJ3c2xJUXRuUFU2aU0iLCJraWQiOiI1dDVZWXBCaE4tRWdJRUVJNWlVenI2cjBNUjAyTG5WUTBPbWVrbU5LY2pZIn19LCJ0eXBlIjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwianRpIjoidXJuOnV1aWQ6YTQ0MmEzNDAtYjM4ZS00OWMzLTlkNDktZjc1OWY0MDgzMWU2Iiwic3RhdHVzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3N0YXR1cyIsImlhdCI6MTY4OTY4OTM0MiwiZXhwIjoyMDA1MjY1MzQyfQ.c3WAnE23wwNRIqFFI0UvYYEbPKnLdnf5Li6iyd92jLtxfhBY05OwZqQ0dD2uBpYSwBIe8sgFkQBFDianZeNhzQ";

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
      issuedAt: new Date(1689689342000),
      expiration: new Date(2005265342000),
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
      issuedAt: new Date(1689689342000),
      expiration: new Date(2005265342000),
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
