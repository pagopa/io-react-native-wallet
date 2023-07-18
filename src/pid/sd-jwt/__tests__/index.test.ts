import { decode } from "..";

const sdjwt =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0cnVzdF9jaGFpbiI6W10sInR5cCI6InZjK3NkLWp3dCJ9.eyJzdWIiOiJMeExqRXJNUkd5cTRmb0ZCODh1TUxiVFQ2cS1rUHNITDhNTGktYloyUWRVIiwidmVyaWZpZWRfY2xhaW1zIjp7ImNsYWltcyI6eyJfc2QiOlsiMnFwTS1SQ2hlR3ZaQUw1cHJDaHJaemtCa0VmQXNGREw4QXRZcVlrZ3UwayIsIjVBYko5WVNFNHpNb0NNRnplbjExNXZBa2ZKMkpzbmoxUnVYNVlvRmRTM0kiLCJJOWVLZHp2TmhBZ3VXekZ0WE8yZmJVQ1pVYWhQOXBmRVpVclpqaGV0YURjIiwiVkNXU2ljbDhxZzJQRzE3RVNIU3c1UEx0QUJ2V1hPLWhqRHVNRG4wTkpONCIsIlo3cWNrVGdSNzRaMzZMWG1oMFc4VXRaRWRrQm1rWnNSNUJPNFN6dzdnNjgiLCJvOThVZHlfdGlZb2c1SVhVYmw1aDJyQ0h4S2J5Y1NXNEQ0OFJ6NldyZXo0Il19LCJ2ZXJpZmljYXRpb24iOnsidHJ1c3RfZnJhbWV3b3JrIjoiZWlkYXMiLCJhc3N1cmFuY2VfbGV2ZWwiOiJoaWdoIiwiX3NkIjpbImVneGtET19CSUFOVXI5V1k0Wl9XQlhBNzNONmNiOXVUTWcwWmVPcXBrSTAiXX19LCJfc2RfYWxnIjoic2hhLTI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsImNuZiI6eyJqd2siOnsiY3J2IjoiUC0yNTYiLCJrdHkiOiJFQyIsIngiOiJxckpyajNBZl9CNTdzYk9JUnJjQk03YnI3d09jOHluajdsSEZQVGVmZlVrIiwieSI6IjFIMGNXRHlHZ3ZVOHcta1BLVV94eWNPQ1VOVDJvMGJ3c2xJUXRuUFU2aU0iLCJraWQiOiI1dDVZWXBCaE4tRWdJRUVJNWlVenI2cjBNUjAyTG5WUTBPbWVrbU5LY2pZIn19LCJ0eXBlIjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwianRpIjoidXJuOnV1aWQ6YTQ0MmEzNDAtYjM4ZS00OWMzLTlkNDktZjc1OWY0MDgzMWU2Iiwic3RhdHVzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3N0YXR1cyIsImlhdCI6MTY4OTY3MTg1OCwiZXhwIjoyMDA1MjQ3ODU4fQ.K13CInC5J0SlrFNYKEL2znK5dfUDemR8Gd5kUfCQUkk34fERIi5W-Rk4DJiqnN_sny21TBraTjnDE_nDlA9Q3w";

const disclosures = [
  "WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImV2aWRlbmNlIiwgW3sidHlwZSI6ICJlbGVjdHJvbmljX3JlY29yZCIsICJyZWNvcmQiOiB7InR5cGUiOiAiZWlkYXMuaXQuY2llIiwgInNvdXJjZSI6IHsib3JnYW5pemF0aW9uX25hbWUiOiAiTWluaXN0ZXJvIGRlbGwnSW50ZXJubyIsICJvcmdhbml6YXRpb25faWQiOiAibV9pdCIsICJjb3VudHJ5X2NvZGUiOiAiSVQifX19XV0",
  "WyJlbHVWNU9nM2dTTklJOEVZbnN4QV9BIiwgInVuaXF1ZV9pZCIsICJ4eHh4eHh4eC14eHh4LXh4eHgteHh4eC14eHh4eHh4eHh4eHgiXQ",
  "WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImdpdmVuX25hbWUiLCAiTWFyaW8iXQ",
  "WyJlSThaV205UW5LUHBOUGVOZW5IZGhRIiwgImZhbWlseV9uYW1lIiwgIlJvc3NpIl0",
  "WyJRZ19PNjR6cUF4ZTQxMmExMDhpcm9BIiwgImJpcnRoZGF0ZSIsICIxOTgwLTAxLTEwIl0",
  "WyJBSngtMDk1VlBycFR0TjRRTU9xUk9BIiwgInBsYWNlX29mX2JpcnRoIiwgeyJjb3VudHJ5IjogIklUIiwgImxvY2FsaXR5IjogIlJvbWUifV0",
  "WyJQYzMzSk0yTGNoY1VfbEhnZ3ZfdWZRIiwgInRheF9pZF9jb2RlIiwgIlRJTklULVhYWFhYWFhYWFhYWFhYWFgiXQ",
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
      issuedAt: new Date(1689671858000),
      expiration: new Date(2005247858000),
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
        uniqueId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        givenName: "Mario",
        familyName: "Rossi",
        birthdate: "1980-01-10",
        placeOfBirth: { country: "IT", locality: "Rome" },
        taxIdCode: "TINIT-XXXXXXXXXXXXXXXX",
      },
    });
  });

  it("should return a valid pid", async () => {
    const result = decode(token);

    expect(result.pid).toEqual({
      issuer: "http://localhost:8080",
      issuedAt: new Date(1689671858000),
      expiration: new Date(2005247858000),
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
        uniqueId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        givenName: "Mario",
        familyName: "Rossi",
        birthdate: "1980-01-10",
        placeOfBirth: { country: "IT", locality: "Rome" },
        taxIdCode: "TINIT-XXXXXXXXXXXXXXXX",
      },
    });
  });
});
