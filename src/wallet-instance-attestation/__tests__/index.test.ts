import { decode } from "..";

// Wallet Instance Attestation
const token =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0cnVzdF9jaGFpbiI6WyJleUpoYkdjaU9pSkZVei4uLjZTMEEiLCJleUpoYkdjaU9pSkZVei4uLmpKTEEiLCJleUpoYkdjaU9pSkZVei4uLkg5Z3ciXSwidHlwIjoidmErand0IiwieDVjIjpbIk1JSUJqRENDIC4uLiBYRmVoZ0tRQT09Il19.eyJpc3MiOiJodHRwczovL3dhbGxldC1wcm92aWRlci5leGFtcGxlLm9yZyIsInN1YiI6InZiZVhKa3NNNDV4cGh0QU5uQ2lHNm1DeXVVNGpmR056b3BHdUt2b2dnOWMiLCJ0eXBlIjoiV2FsbGV0SW5zdGFuY2VBdHRlc3RhdGlvbiIsInBvbGljeV91cmkiOiJodHRwczovL3dhbGxldC1wcm92aWRlci5leGFtcGxlLm9yZy9wcml2YWN5X3BvbGljeSIsInRvc191cmkiOiJodHRwczovL3dhbGxldC1wcm92aWRlci5leGFtcGxlLm9yZy9pbmZvX3BvbGljeSIsImxvZ29fdXJpIjoiaHR0cHM6Ly93YWxsZXQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvbG9nby5zdmciLCJhc2MiOiJodHRwczovL3dhbGxldC1wcm92aWRlci5leGFtcGxlLm9yZy9Mb0EvYmFzaWMiLCJjbmYiOnsiandrIjp7ImNydiI6IlAtMjU2Iiwia3R5IjoiRUMiLCJ4IjoiNEhOcHRJLXhyMnBqeVJKS0dNbno0V21kblFEX3VKU3E0Ujk1Tmo5OGI0NCIsInkiOiJMSVpuU0IzOXZGSmhZZ1MzazdqWEU0cjMtQ29HRlF3WnRQQklScXBObHJnIiwia2lkIjoidmJlWEprc000NXhwaHRBTm5DaUc2bUN5dVU0amZHTnpvcEd1S3ZvZ2c5YyJ9fSwiYXV0aG9yaXphdGlvbl9lbmRwb2ludCI6ImV1ZGl3OiIsInJlc3BvbnNlX3R5cGVzX3N1cHBvcnRlZCI6WyJ2cF90b2tlbiJdLCJ2cF9mb3JtYXRzX3N1cHBvcnRlZCI6eyJqd3RfdnBfanNvbiI6eyJhbGdfdmFsdWVzX3N1cHBvcnRlZCI6WyJFUzI1NiJdfSwiand0X3ZjX2pzb24iOnsiYWxnX3ZhbHVlc19zdXBwb3J0ZWQiOlsiRVMyNTYiXX19LCJyZXF1ZXN0X29iamVjdF9zaWduaW5nX2FsZ192YWx1ZXNfc3VwcG9ydGVkIjpbIkVTMjU2Il0sInByZXNlbnRhdGlvbl9kZWZpbml0aW9uX3VyaV9zdXBwb3J0ZWQiOmZhbHNlLCJpYXQiOjE2ODcyODExOTUsImV4cCI6MTY4NzI4ODM5NX0.OTuPik6p3o9j6VOx-uCyxRvHwoh1pDiiZcBQFNQt2uE3dK-8izGNflJVETi_uhGSZOf25Enkq-UvEin9NrbJNw";

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
      typ: "va+jwt",
      x5c: ["MIIBjDCC ... XFehgKQA=="],
    });

    // check payload in deep
    expect(result.payload).toEqual({
      iss: "https://wallet-provider.example.org",
      sub: "vbeXJksM45xphtANnCiG6mCyuU4jfGNzopGuKvogg9c",
      type: "WalletInstanceAttestation",
      policy_uri: "https://wallet-provider.example.org/privacy_policy",
      tos_uri: "https://wallet-provider.example.org/info_policy",
      logo_uri: "https://wallet-provider.example.org/logo.svg",
      asc: "https://wallet-provider.example.org/LoA/basic",
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
        jwt_vp_json: {
          alg_values_supported: ["ES256"],
        },
        jwt_vc_json: {
          alg_values_supported: ["ES256"],
        },
      },
      request_object_signing_alg_values_supported: ["ES256"],
      presentation_definition_uri_supported: false,
      iat: 1687281195,
      exp: 1687288395,
    });
  });
});
