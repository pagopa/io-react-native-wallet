import { decode, disclose } from "../index";

import { encodeBase64, decodeBase64 } from "@pagopa/io-react-native-jwt";
import { SdJwt4VC } from "../types";

// Examples from https://www.ietf.org/id/draft-terbu-sd-jwt-vc-02.html#name-example-4
// but adapted to adhere to format declared in https://italia.github.io/eudi-wallet-it-docs/versione-corrente/en/pid-eaa-data-model.html#id2
// In short, the token is a Frankenstein composed as follows:
//  - the header is taken from the italian specification, with kid and alg valued according to the signing keys
//  - disclosures are taken from the SD-JWT-4-VC standard
//  - payload is taken from the italian specification, but _sd are compiled with:
//    - "address" is used as verification._sd
//    - all others disclosures are in claims._sd
const token =
  "eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImIxODZlYTBjMTkyNTc5MzA5N2JmMDFiOGEyODlhNDVmIiwidHJ1c3RfY2hhaW4iOlsiTkVoUmRFUnBZbmxIWTNNNVdsZFdUV1oyYVVobSAuLi4iLCJleUpoYkdjaU9pSlNVekkxTmlJc0ltdHBaQ0k2IC4uLiIsIklrSllkbVp5Ykc1b1FVMTFTRkl3TjJGcVZXMUIgLi4uIl19.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tL2lzc3VlciIsInN1YiI6Ik56YkxzWGg4dURDY2Q3bm9XWEZaQWZIa3hac1JHQzlYcy4uLiIsImp0aSI6InVybjp1dWlkOjZjNWMwYTQ5LWI1ODktNDMxZC1iYWU3LTIxOTEyMmE5ZWMyYyIsImlhdCI6MTU0MTQ5MzcyNCwiZXhwIjoxNTQxNDkzNzI0LCJzdGF0dXMiOiJodHRwczovL2V4YW1wbGUuY29tL3N0YXR1cyIsImNuZiI6eyJqd2siOnsia3R5IjoiUlNBIiwidXNlIjoic2lnIiwibiI6IjFUYS1zRSIsImUiOiJBUUFCIiwia2lkIjoiWWhORlMzWW5DOXRqaUNhaXZoV0xWVUozQXh3R0d6Xzk4dVJGYXFNRUVzIn19LCJ0eXBlIjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwidmVyaWZpZWRfY2xhaW1zIjp7InZlcmlmaWNhdGlvbiI6eyJfc2QiOlsiSnpZakg0c3ZsaUgwUjNQeUVNZmVadTZKdDY5dTVxZWhabzdGN0VQWWxTRSJdLCJ0cnVzdF9mcmFtZXdvcmsiOiJlaWRhcyIsImFzc3VyYW5jZV9sZXZlbCI6ImhpZ2gifSwiY2xhaW1zIjp7Il9zZCI6WyIwOXZLckpNT2x5VFdNMHNqcHVfcGRPQlZCUTJNMXkzS2hwSDUxNW5Ya3BZIiwiMnJzakdiYUMwa3k4bVQwcEpyUGlvV1RxMF9kYXcxc1g3NnBvVWxnQ3diSSIsIkVrTzhkaFcwZEhFSmJ2VUhsRV9WQ2V1Qzl1UkVMT2llTFpoaDdYYlVUdEEiLCJJbER6SUtlaVpkRHdwcXBLNlpmYnlwaEZ2ejVGZ25XYS1zTjZ3cVFYQ2l3IiwiUG9yRmJwS3VWdTZ4eW1KYWd2a0ZzRlhBYlJvYzJKR2xBVUEyQkE0bzdjSSIsIlRHZjRvTGJnd2Q1SlFhSHlLVlFaVTlVZEdFMHc1cnREc3JaemZVYW9tTG8iLCJqZHJURThZY2JZNEVpZnVnaWhpQWVfQlBla3hKUVpJQ2VpVVF3WTlRcXhJIiwianN1OXlWdWx3UVFsaEZsTV8zSmx6TWFTRnpnbGhRRzBEcGZheVF3TFVLNCJdfX0sIl9zZF9hbGciOiJzaGEtMjU2In0.8wwSHCd47wCgzRYXvvPTTRXGS-hk9V8jRzy7WSjRBTZxSHxJkGOSWwBVAA-kpJ-IvQS7699aLWxIMqAvr34sOA~WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd~WyJlbHVWNU9nM2dTTklJOEVZbnN4QV9BIiwgImZhbWlseV9uYW1lIiwgIkRvZSJd~WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImVtYWlsIiwgImpvaG5kb2VAZXhhbXBsZS5jb20iXQ~WyJlSThaV205UW5LUHBOUGVOZW5IZGhRIiwgInBob25lX251bWJlciIsICIrMS0yMDItNTU1LTAxMDEiXQ~WyJBSngtMDk1VlBycFR0TjRRTU9xUk9BIiwgImJpcnRoZGF0ZSIsICIxOTQwLTAxLTAxIl0~WyJQYzMzSk0yTGNoY1VfbEhnZ3ZfdWZRIiwgImlzX292ZXJfMTgiLCB0cnVlXQ~WyJHMDJOU3JRZmpGWFE3SW8wOXN5YWpBIiwgImlzX292ZXJfMjEiLCB0cnVlXQ~WyJsa2x4RjVqTVlsR1RQVW92TU5JdkNBIiwgImlzX292ZXJfNjUiLCB0cnVlXQ~WyJRZ19PNjR6cUF4ZTQxMmExMDhpcm9BIiwgImFkZHJlc3MiLCB7InN0cmVldF9hZGRyZXNzIjogIjEyMyBNYWluIFN0IiwgImxvY2FsaXR5IjogIkFueXRvd24iLCAicmVnaW9uIjogIkFueXN0YXRlIiwgImNvdW50cnkiOiAiVVMifV0";

const unsigned =
  "eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImIxODZlYTBjMTkyNTc5MzA5N2JmMDFiOGEyODlhNDVmIiwidHJ1c3RfY2hhaW4iOlsiTkVoUmRFUnBZbmxIWTNNNVdsZFdUV1oyYVVobSAuLi4iLCJleUpoYkdjaU9pSlNVekkxTmlJc0ltdHBaQ0k2IC4uLiIsIklrSllkbVp5Ykc1b1FVMTFTRkl3TjJGcVZXMUIgLi4uIl19.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tL2lzc3VlciIsInN1YiI6Ik56YkxzWGg4dURDY2Q3bm9XWEZaQWZIa3hac1JHQzlYcy4uLiIsImp0aSI6InVybjp1dWlkOjZjNWMwYTQ5LWI1ODktNDMxZC1iYWU3LTIxOTEyMmE5ZWMyYyIsImlhdCI6MTU0MTQ5MzcyNCwiZXhwIjoxNTQxNDkzNzI0LCJzdGF0dXMiOiJodHRwczovL2V4YW1wbGUuY29tL3N0YXR1cyIsImNuZiI6eyJqd2siOnsia3R5IjoiUlNBIiwidXNlIjoic2lnIiwibiI6IjFUYS1zRSIsImUiOiJBUUFCIiwia2lkIjoiWWhORlMzWW5DOXRqaUNhaXZoV0xWVUozQXh3R0d6Xzk4dVJGYXFNRUVzIn19LCJ0eXBlIjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwidmVyaWZpZWRfY2xhaW1zIjp7InZlcmlmaWNhdGlvbiI6eyJfc2QiOlsiSnpZakg0c3ZsaUgwUjNQeUVNZmVadTZKdDY5dTVxZWhabzdGN0VQWWxTRSJdLCJ0cnVzdF9mcmFtZXdvcmsiOiJlaWRhcyIsImFzc3VyYW5jZV9sZXZlbCI6ImhpZ2gifSwiY2xhaW1zIjp7Il9zZCI6WyIwOXZLckpNT2x5VFdNMHNqcHVfcGRPQlZCUTJNMXkzS2hwSDUxNW5Ya3BZIiwiMnJzakdiYUMwa3k4bVQwcEpyUGlvV1RxMF9kYXcxc1g3NnBvVWxnQ3diSSIsIkVrTzhkaFcwZEhFSmJ2VUhsRV9WQ2V1Qzl1UkVMT2llTFpoaDdYYlVUdEEiLCJJbER6SUtlaVpkRHdwcXBLNlpmYnlwaEZ2ejVGZ25XYS1zTjZ3cVFYQ2l3IiwiUG9yRmJwS3VWdTZ4eW1KYWd2a0ZzRlhBYlJvYzJKR2xBVUEyQkE0bzdjSSIsIlRHZjRvTGJnd2Q1SlFhSHlLVlFaVTlVZEdFMHc1cnREc3JaemZVYW9tTG8iLCJqZHJURThZY2JZNEVpZnVnaWhpQWVfQlBla3hKUVpJQ2VpVVF3WTlRcXhJIiwianN1OXlWdWx3UVFsaEZsTV8zSmx6TWFTRnpnbGhRRzBEcGZheVF3TFVLNCJdfX0sIl9zZF9hbGciOiJzaGEtMjU2In0";

const signature =
  "8wwSHCd47wCgzRYXvvPTTRXGS-hk9V8jRzy7WSjRBTZxSHxJkGOSWwBVAA-kpJ-IvQS7699aLWxIMqAvr34sOA";

const signed = `${unsigned}.${signature}`;

const tokenizedDisclosures = [
  "WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd",
  "WyJlbHVWNU9nM2dTTklJOEVZbnN4QV9BIiwgImZhbWlseV9uYW1lIiwgIkRvZSJd",
  "WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImVtYWlsIiwgImpvaG5kb2VAZXhhbXBsZS5jb20iXQ",
  "WyJlSThaV205UW5LUHBOUGVOZW5IZGhRIiwgInBob25lX251bWJlciIsICIrMS0yMDItNTU1LTAxMDEiXQ",
  "WyJBSngtMDk1VlBycFR0TjRRTU9xUk9BIiwgImJpcnRoZGF0ZSIsICIxOTQwLTAxLTAxIl0",
  "WyJQYzMzSk0yTGNoY1VfbEhnZ3ZfdWZRIiwgImlzX292ZXJfMTgiLCB0cnVlXQ",
  "WyJHMDJOU3JRZmpGWFE3SW8wOXN5YWpBIiwgImlzX292ZXJfMjEiLCB0cnVlXQ",
  "WyJsa2x4RjVqTVlsR1RQVW92TU5JdkNBIiwgImlzX292ZXJfNjUiLCB0cnVlXQ",
  "WyJRZ19PNjR6cUF4ZTQxMmExMDhpcm9BIiwgImFkZHJlc3MiLCB7InN0cmVldF9hZGRyZXNzIjogIjEyMyBNYWluIFN0IiwgImxvY2FsaXR5IjogIkFueXRvd24iLCAicmVnaW9uIjogIkFueXN0YXRlIiwgImNvdW50cnkiOiAiVVMifV0",
];

const sdJwt = {
  header: {
    typ: "vc+sd-jwt",
    alg: "ES256",
    kid: "b186ea0c1925793097bf01b8a289a45f",
    trust_chain: [
      "NEhRdERpYnlHY3M5WldWTWZ2aUhm ...",
      "eyJhbGciOiJSUzI1NiIsImtpZCI6 ...",
      "IkJYdmZybG5oQU11SFIwN2FqVW1B ...",
    ],
  },
  payload: {
    iss: "https://example.com/issuer",
    sub: "NzbLsXh8uDCcd7noWXFZAfHkxZsRGC9Xs...",
    jti: "urn:uuid:6c5c0a49-b589-431d-bae7-219122a9ec2c",
    iat: 1541493724,
    exp: 1541493724,
    status: "https://example.com/status",
    cnf: {
      jwk: {
        kty: "RSA",
        use: "sig",
        n: "1Ta-sE",
        e: "AQAB",
        kid: "YhNFS3YnC9tjiCaivhWLVUJ3AxwGGz_98uRFaqMEEs",
      },
    },
    type: "PersonIdentificationData",
    verified_claims: {
      verification: {
        _sd: ["JzYjH4svliH0R3PyEMfeZu6Jt69u5qehZo7F7EPYlSE"],
        trust_framework: "eidas",
        assurance_level: "high",
      },
      claims: {
        _sd: [
          "09vKrJMOlyTWM0sjpu_pdOBVBQ2M1y3KhpH515nXkpY",
          "2rsjGbaC0ky8mT0pJrPioWTq0_daw1sX76poUlgCwbI",
          "EkO8dhW0dHEJbvUHlE_VCeuC9uRELOieLZhh7XbUTtA",
          "IlDzIKeiZdDwpqpK6ZfbyphFvz5FgnWa-sN6wqQXCiw",
          "PorFbpKuVu6xymJagvkFsFXAbRoc2JGlAUA2BA4o7cI",
          "TGf4oLbgwd5JQaHyKVQZU9UdGE0w5rtDsrZzfUaomLo",
          "jdrTE8YcbY4EifugihiAe_BPekxJQZICeiUQwY9QqxI",
          "jsu9yVulwQQlhFlM_3JlzMaSFzglhQG0DpfayQwLUK4",
        ],
      },
    },
    _sd_alg: "sha-256",
  },
};

// In the very same order than tokenizedDisclosures
const disclosures = [
  ["2GLC42sKQveCfGfryNRN9w", "given_name", "John"],
  ["eluV5Og3gSNII8EYnsxA_A", "family_name", "Doe"],
  ["6Ij7tM-a5iVPGboS5tmvVA", "email", "johndoe@example.com"],
  ["eI8ZWm9QnKPpNPeNenHdhQ", "phone_number", "+1-202-555-0101"],
  ["AJx-095VPrpTtN4QMOqROA", "birthdate", "1940-01-01"],
  ["Pc33JM2LchcU_lHggv_ufQ", "is_over_18", true],
  ["G02NSrQfjFXQ7Io09syajA", "is_over_21", true],
  ["lklxF5jMYlGTPUovMNIvCA", "is_over_65", true],
  [
    "Qg_O64zqAxe412a108iroA",
    "address",
    {
      street_address: "123 Main St",
      locality: "Anytown",
      region: "Anystate",
      country: "US",
    },
  ],
];
it("Ensures example data correctness", () => {
  expect(
    JSON.parse(decodeBase64(encodeBase64(JSON.stringify(sdJwt.header))))
  ).toEqual(sdJwt.header);
  expect([signed, ...tokenizedDisclosures].join("~")).toBe(token);
});

describe("decode", () => {
  it("should decode a valid token", () => {
    const result = decode(token, SdJwt4VC);
    expect(result).toEqual({
      sdJwt,
      disclosures: disclosures.map((decoded, i) => ({
        decoded,
        encoded: tokenizedDisclosures[i],
      })),
    });
  });
});

describe("disclose", () => {
  it("should encode a valid sdjwt (one claim)", async () => {
    const result = await disclose(token, ["given_name"]);
    const expected = {
      token: `${signed}~WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd`,
      paths: [{ claim: "given_name", path: "verified_claims.claims._sd[7]" }],
    };

    expect(result).toEqual(expected);
  });

  it("should encode a valid sdjwt (no claims)", async () => {
    const result = await disclose(token, []);
    const expected = { token: `${signed}`, paths: [] };

    expect(result).toEqual(expected);
  });

  it("should encode a valid sdjwt (multiple claims)", async () => {
    const result = await disclose(token, ["given_name", "email"]);
    const expected = {
      token: `${signed}~WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd~WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImVtYWlsIiwgImpvaG5kb2VAZXhhbXBsZS5jb20iXQ`,
      paths: [
        {
          claim: "given_name",
          path: "verified_claims.claims._sd[7]",
        },
        {
          claim: "email",
          path: "verified_claims.verification._sd[0]",
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("should fail on unknown claim", async () => {
    const fn = async () => disclose(token, ["unknown"]);

    await expect(fn()).rejects.toEqual(expect.any(Error));
  });
});
