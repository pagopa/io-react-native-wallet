import { z } from "zod";
import { decode, disclose } from "../index";

import { encodeBase64, decodeBase64 } from "@pagopa/io-react-native-jwt";

// Examples from https://www.ietf.org/id/draft-terbu-sd-jwt-vc-02.html#name-example-4
const token =
  "eyJhbGciOiAiRVMyNTYifQ.eyJfc2QiOiBbIjA5dktySk1PbHlUV00wc2pwdV9wZE9CVkJRMk0xeTNLaHBINTE1blhrcFkiLCAiMnJzakdiYUMwa3k4bVQwcEpyUGlvV1RxMF9kYXcxc1g3NnBvVWxnQ3diSSIsICJFa084ZGhXMGRIRUpidlVIbEVfVkNldUM5dVJFTE9pZUxaaGg3WGJVVHRBIiwgIklsRHpJS2VpWmREd3BxcEs2WmZieXBoRnZ6NUZnbldhLXNONndxUVhDaXciLCAiSnpZakg0c3ZsaUgwUjNQeUVNZmVadTZKdDY5dTVxZWhabzdGN0VQWWxTRSIsICJQb3JGYnBLdVZ1Nnh5bUphZ3ZrRnNGWEFiUm9jMkpHbEFVQTJCQTRvN2NJIiwgIlRHZjRvTGJnd2Q1SlFhSHlLVlFaVTlVZEdFMHc1cnREc3JaemZVYW9tTG8iLCAiamRyVEU4WWNiWTRFaWZ1Z2loaUFlX0JQZWt4SlFaSUNlaVVRd1k5UXF4SSIsICJqc3U5eVZ1bHdRUWxoRmxNXzNKbHpNYVNGemdsaFFHMERwZmF5UXdMVUs0Il0sICJpc3MiOiAiaHR0cHM6Ly9leGFtcGxlLmNvbS9pc3N1ZXIiLCAiaWF0IjogMTY4MzAwMDAwMCwgImV4cCI6IDE4ODMwMDAwMDAsICJ0eXBlIjogIklkZW50aXR5Q3JlZGVudGlhbCIsICJfc2RfYWxnIjogInNoYS0yNTYiLCAiY25mIjogeyJqd2siOiB7Imt0eSI6ICJFQyIsICJjcnYiOiAiUC0yNTYiLCAieCI6ICJUQ0FFUjE5WnZ1M09IRjRqNFc0dmZTVm9ISVAxSUxpbERsczd2Q2VHZW1jIiwgInkiOiAiWnhqaVdXYlpNUUdIVldLVlE0aGJTSWlyc1ZmdWVjQ0U2dDRqVDlGMkhaUSJ9fX0.L67RXASLpGi_87_yukqvXGoSgarNxDIlu9M7aSK5rWObaN08YERCxlP7CY8eTjFkHMVWRqnFLdpDdebBzmRXiA~WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd~WyJlbHVWNU9nM2dTTklJOEVZbnN4QV9BIiwgImZhbWlseV9uYW1lIiwgIkRvZSJd~WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImVtYWlsIiwgImpvaG5kb2VAZXhhbXBsZS5jb20iXQ~WyJlSThaV205UW5LUHBOUGVOZW5IZGhRIiwgInBob25lX251bWJlciIsICIrMS0yMDItNTU1LTAxMDEiXQ~WyJRZ19PNjR6cUF4ZTQxMmExMDhpcm9BIiwgImFkZHJlc3MiLCB7InN0cmVldF9hZGRyZXNzIjogIjEyMyBNYWluIFN0IiwgImxvY2FsaXR5IjogIkFueXRvd24iLCAicmVnaW9uIjogIkFueXN0YXRlIiwgImNvdW50cnkiOiAiVVMifV0~WyJBSngtMDk1VlBycFR0TjRRTU9xUk9BIiwgImJpcnRoZGF0ZSIsICIxOTQwLTAxLTAxIl0~WyJQYzMzSk0yTGNoY1VfbEhnZ3ZfdWZRIiwgImlzX292ZXJfMTgiLCB0cnVlXQ~WyJHMDJOU3JRZmpGWFE3SW8wOXN5YWpBIiwgImlzX292ZXJfMjEiLCB0cnVlXQ~WyJsa2x4RjVqTVlsR1RQVW92TU5JdkNBIiwgImlzX292ZXJfNjUiLCB0cnVlXQ";

const unsigned =
  "eyJhbGciOiAiRVMyNTYifQ.eyJfc2QiOiBbIjA5dktySk1PbHlUV00wc2pwdV9wZE9CVkJRMk0xeTNLaHBINTE1blhrcFkiLCAiMnJzakdiYUMwa3k4bVQwcEpyUGlvV1RxMF9kYXcxc1g3NnBvVWxnQ3diSSIsICJFa084ZGhXMGRIRUpidlVIbEVfVkNldUM5dVJFTE9pZUxaaGg3WGJVVHRBIiwgIklsRHpJS2VpWmREd3BxcEs2WmZieXBoRnZ6NUZnbldhLXNONndxUVhDaXciLCAiSnpZakg0c3ZsaUgwUjNQeUVNZmVadTZKdDY5dTVxZWhabzdGN0VQWWxTRSIsICJQb3JGYnBLdVZ1Nnh5bUphZ3ZrRnNGWEFiUm9jMkpHbEFVQTJCQTRvN2NJIiwgIlRHZjRvTGJnd2Q1SlFhSHlLVlFaVTlVZEdFMHc1cnREc3JaemZVYW9tTG8iLCAiamRyVEU4WWNiWTRFaWZ1Z2loaUFlX0JQZWt4SlFaSUNlaVVRd1k5UXF4SSIsICJqc3U5eVZ1bHdRUWxoRmxNXzNKbHpNYVNGemdsaFFHMERwZmF5UXdMVUs0Il0sICJpc3MiOiAiaHR0cHM6Ly9leGFtcGxlLmNvbS9pc3N1ZXIiLCAiaWF0IjogMTY4MzAwMDAwMCwgImV4cCI6IDE4ODMwMDAwMDAsICJ0eXBlIjogIklkZW50aXR5Q3JlZGVudGlhbCIsICJfc2RfYWxnIjogInNoYS0yNTYiLCAiY25mIjogeyJqd2siOiB7Imt0eSI6ICJFQyIsICJjcnYiOiAiUC0yNTYiLCAieCI6ICJUQ0FFUjE5WnZ1M09IRjRqNFc0dmZTVm9ISVAxSUxpbERsczd2Q2VHZW1jIiwgInkiOiAiWnhqaVdXYlpNUUdIVldLVlE0aGJTSWlyc1ZmdWVjQ0U2dDRqVDlGMkhaUSJ9fX0";

const signature =
  "L67RXASLpGi_87_yukqvXGoSgarNxDIlu9M7aSK5rWObaN08YERCxlP7CY8eTjFkHMVWRqnFLdpDdebBzmRXiA";

const signed = `${unsigned}.${signature}`;

const tokenizedDisclosures = [
  "WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd",
  "WyJlbHVWNU9nM2dTTklJOEVZbnN4QV9BIiwgImZhbWlseV9uYW1lIiwgIkRvZSJd",
  "WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImVtYWlsIiwgImpvaG5kb2VAZXhhbXBsZS5jb20iXQ",
  "WyJlSThaV205UW5LUHBOUGVOZW5IZGhRIiwgInBob25lX251bWJlciIsICIrMS0yMDItNTU1LTAxMDEiXQ",
  "WyJRZ19PNjR6cUF4ZTQxMmExMDhpcm9BIiwgImFkZHJlc3MiLCB7InN0cmVldF9hZGRyZXNzIjogIjEyMyBNYWluIFN0IiwgImxvY2FsaXR5IjogIkFueXRvd24iLCAicmVnaW9uIjogIkFueXN0YXRlIiwgImNvdW50cnkiOiAiVVMifV0",
  "WyJBSngtMDk1VlBycFR0TjRRTU9xUk9BIiwgImJpcnRoZGF0ZSIsICIxOTQwLTAxLTAxIl0",
  "WyJQYzMzSk0yTGNoY1VfbEhnZ3ZfdWZRIiwgImlzX292ZXJfMTgiLCB0cnVlXQ",
  "WyJHMDJOU3JRZmpGWFE3SW8wOXN5YWpBIiwgImlzX292ZXJfMjEiLCB0cnVlXQ",
  "WyJsa2x4RjVqTVlsR1RQVW92TU5JdkNBIiwgImlzX292ZXJfNjUiLCB0cnVlXQ",
];

const sdJwt = {
  header: {
    alg: "ES256",
  },
  payload: {
    _sd: [
      "09vKrJMOlyTWM0sjpu_pdOBVBQ2M1y3KhpH515nXkpY",
      "2rsjGbaC0ky8mT0pJrPioWTq0_daw1sX76poUlgCwbI",
      "EkO8dhW0dHEJbvUHlE_VCeuC9uRELOieLZhh7XbUTtA",
      "IlDzIKeiZdDwpqpK6ZfbyphFvz5FgnWa-sN6wqQXCiw",
      "JzYjH4svliH0R3PyEMfeZu6Jt69u5qehZo7F7EPYlSE",
      "PorFbpKuVu6xymJagvkFsFXAbRoc2JGlAUA2BA4o7cI",
      "TGf4oLbgwd5JQaHyKVQZU9UdGE0w5rtDsrZzfUaomLo",
      "jdrTE8YcbY4EifugihiAe_BPekxJQZICeiUQwY9QqxI",
      "jsu9yVulwQQlhFlM_3JlzMaSFzglhQG0DpfayQwLUK4",
    ],
    iss: "https://example.com/issuer",
    iat: 1683000000,
    exp: 1883000000,
    type: "IdentityCredential",
    _sd_alg: "sha-256",
    cnf: {
      jwk: {
        kty: "EC",
        crv: "P-256",
        x: "TCAER19Zvu3OHF4j4W4vfSVoHIP1ILilDls7vCeGemc",
        y: "ZxjiWWbZMQGHVWKVQ4hbSIirsVfuecCE6t4jT9F2HZQ",
      },
    },
  },
};

// In the very same order than tokenizedDisclosures
const disclosures = [
  ["2GLC42sKQveCfGfryNRN9w", "given_name", "John"],
  ["eluV5Og3gSNII8EYnsxA_A", "family_name", "Doe"],
  ["6Ij7tM-a5iVPGboS5tmvVA", "email", "johndoe@example.com"],
  ["eI8ZWm9QnKPpNPeNenHdhQ", "phone_number", "+1-202-555-0101"],
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
  ["AJx-095VPrpTtN4QMOqROA", "birthdate", "1940-01-01"],
  ["Pc33JM2LchcU_lHggv_ufQ", "is_over_18", true],
  ["G02NSrQfjFXQ7Io09syajA", "is_over_21", true],
  ["lklxF5jMYlGTPUovMNIvCA", "is_over_65", true],
];
it("Ensures example data correctness", () => {
  expect(
    JSON.parse(decodeBase64(encodeBase64(JSON.stringify(sdJwt.header))))
  ).toEqual(sdJwt.header);
  expect([signed, ...tokenizedDisclosures].join("~")).toBe(token);
});

describe("decode", () => {
  it("should decode a valid token", () => {
    // @ts-ignore because z.any() != z.AnyObject()
    const result = decode(token, z.any());

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
  it("should encode a valid sdjwt (one claim)", () => {
    const result = disclose(token, ["given_name"]);
    const expected = `${signed}~WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd`;

    expect(result).toEqual(expected);
  });

  it("should encode a valid sdjwt (no claims)", () => {
    const result = disclose(token, []);
    const expected = `${signed}`;

    expect(result).toEqual(expected);
  });

  it("should encode a valid sdjwt (multiple claims)", () => {
    const result = disclose(token, ["given_name", "email"]);
    const expected = `${signed}~WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd~WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImVtYWlsIiwgImpvaG5kb2VAZXhhbXBsZS5jb20iXQ`;

    expect(result).toEqual(expected);
  });

  it("should fail on unknown claim", () => {
    const fn = () => disclose(token, ["unknown"]);

    expect(fn).toThrow();
  });
});
