import { decode } from "..";

// Wallet Instance Attestation
const token =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0cnVzdF9jaGFpbiI6WyJleUpoYkdjaU9pSkZVei4uLjZTMEEiLCJleUpoYkdjaU9pSkZVei4uLmpKTEEiLCJleUpoYkdjaU9pSkZVei4uLkg5Z3ciXSwidHlwIjoid2FsbGV0LWF0dGVzdGF0aW9uK2p3dCIsIng1YyI6WyJNSUlCakRDQyAuLi4gWEZlaGdLUUE9PSJdfQ.eyJpc3MiOiJodHRwczovL3dhbGxldC1wcm92aWRlci5leGFtcGxlLm9yZyIsInN1YiI6InZiZVhKa3NNNDV4cGh0QU5uQ2lHNm1DeXVVNGpmR056b3BHdUt2b2dnOWMiLCJhdHRlc3RlZF9zZWN1cml0eV9jb250ZXh0IjoiaHR0cHM6Ly93YWxsZXQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvTG9BL2Jhc2ljIiwiY25mIjp7Imp3ayI6eyJjcnYiOiJQLTI1NiIsImt0eSI6IkVDIiwieCI6IjRITnB0SS14cjJwanlSSktHTW56NFdtZG5RRF91SlNxNFI5NU5qOThiNDQiLCJ5IjoiTElablNCMzl2RkpoWWdTM2s3alhFNHIzLUNvR0ZRd1p0UEJJUnFwTmxyZyIsImtpZCI6InZiZVhKa3NNNDV4cGh0QU5uQ2lHNm1DeXVVNGpmR056b3BHdUt2b2dnOWMifX0sImF1dGhvcml6YXRpb25fZW5kcG9pbnQiOiJldWRpdzoiLCJyZXNwb25zZV90eXBlc19zdXBwb3J0ZWQiOlsidnBfdG9rZW4iXSwidnBfZm9ybWF0c19zdXBwb3J0ZWQiOnsiand0X3ZwX2pzb24iOnsiYWxnX3ZhbHVlc19zdXBwb3J0ZWQiOlsiRVMyNTYiXX0sImp3dF92Y19qc29uIjp7ImFsZ192YWx1ZXNfc3VwcG9ydGVkIjpbIkVTMjU2Il19fSwicmVxdWVzdF9vYmplY3Rfc2lnbmluZ19hbGdfdmFsdWVzX3N1cHBvcnRlZCI6WyJFUzI1NiJdLCJwcmVzZW50YXRpb25fZGVmaW5pdGlvbl91cmlfc3VwcG9ydGVkIjpmYWxzZSwiaWF0IjoxNjk0NTk3NDM3LCJleHAiOjE2OTQ2MDQ2Mzd9.kg3llifa04avKP4t8uz-9ng2ODo1SX8KoXVQpoGIlcJThlEw40tp4NRUiW_iJvGd3fZD8eIbQ3tdrXKlJSXZRQ";

describe("decode", () => {
  it("should return Wallet Instance Attestation", async () => {
    const result = decode(token);

    // check shallow shape
    expect(result).toEqual(expect.any(Object));

    // check header in deep
    expect(result.header).toEqual({
      alg: "ES256",
      kid: "5t5YYpBhN-EgIEEI5iUzr6r0MR02LnVQ0OmekmNKcjY",
      trust_chain: [
        "eyJhbGciOiJFUz...6S0A",
        "eyJhbGciOiJFUz...jJLA",
        "eyJhbGciOiJFUz...H9gw",
      ],
      typ: "wallet-attestation+jwt",
      x5c: ["MIIBjDCC ... XFehgKQA=="],
    });

    // check payload in deep
    expect(result.payload).toEqual({
      iss: "https://wallet-provider.example.org",
      sub: "vbeXJksM45xphtANnCiG6mCyuU4jfGNzopGuKvogg9c",
      aal: "https://wallet-provider.example.org/LoA/basic",
      cnf: {
        jwk: {
          crv: "P-256",
          kty: "EC",
          x: "4HNptI-xr2pjyRJKGMnz4WmdnQD_uJSq4R95Nj98b44",
          y: "LIZnSB39vFJhYgS3k7jXE4r3-CoGFQwZtPBIRqpNlrg",
          kid: "vbeXJksM45xphtANnCiG6mCyuU4jfGNzopGuKvogg9c",
        },
      },
      authorization_endpoint: "eudiw:",
      response_types_supported: ["vp_token"],
      vp_formats_supported: {
        "vc+sd-jwt": {
          "sd-jwt_alg_values": ["ES256"],
        },
        "vp+sd-jwt": {
          "sd-jwt_alg_values": ["ES256"],
        },
      },
      request_object_signing_alg_values_supported: ["ES256"],
      presentation_definition_uri_supported: false,
      iat: 1694597437,
      exp: 1694604637,
    });
  });
});
