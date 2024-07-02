import { z } from "zod";
import { decode, disclose } from "../index";

import { encodeBase64, decodeBase64 } from "@pagopa/io-react-native-jwt";
import { SdJwt4VC } from "../types";

// Examples from https://www.ietf.org/archive/id/draft-terbu-sd-jwt-vc-02.html#name-example-4
// but adapted to adhere to format declared in https://italia.github.io/eudi-wallet-it-docs/versione-corrente/en/pid-eaa-data-model.html#id2
// In short, the token is a Frankenstein composed as follows:
//  - the header is taken from the italian specification, with kid and alg valued according to the signing keys
//  - disclosures are taken from the SD-JWT-4-VC standard
//  - payload is taken from the italian specification, but _sd are compiled with:
//    - "address" is used as verification._sd
//    - all others disclosures are in claims._sd
const token =
  "eyJraWQiOiItRl82VWdhOG4zVmVnalkyVTdZVUhLMXpMb2FELU5QVGM2M1JNSVNuTGF3IiwidHlwIjoidmMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJfc2QiOlsiNmxmdUEyY2xrLXJpaGJGZkhCdDBOd0wwaFJQRXJ3cDZ2NFBTQVZLc24zSSIsIkFza2xIRzhlR0VXTkNXLXNQTEkzZnVLWkRsUVpjenlPTXprUE5KZG9DbnciLCJJVU01bVZzbzFOVjVqcUh4OE4wUWJXb09aNWlVQzN4eDM3RThrMHVDR2gwIiwiUkMyMGVEbmFpZHI1N2dZd0hLRDc4bUxTWEFqUkIzemZZNUM4QkZXX1RyWSIsIlNPb1dFU1RyYjJScHRNMTZTcnVoWFRaaFlxS0lpclI0Z3JYQlMzVTdQUkUiLCJUWEdla0g4cVl0QjNLLVBmVHZOSlFVOURFMk1JNGhHc05XY2REcHQyZm04Il0sInN1YiI6ImU3YzJlOTRjLWY3NDEtNGZmZS1hNjY4LTQ2ZWI3NDIxODNjYSIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwiaXNzIjoiaHR0cHM6Ly9wcmUuZWlkLndhbGxldC5pcHpzLml0IiwiY25mIjp7Imp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2Iiwia2lkIjoiekV2X3FHU0w1cjBfRjY3ajJkd0VnVUptQmdiTU5TRUo1S19pSDFQWWM3QSIsIngiOiIwUGo3dl9hZk5wOUVUSngxMUpiWWdrSTd5UXBkMHJ0aVl1bzVmZXVBTjJvIiwieSI6IlhCNjJVbTAydkhxZWRrT3pTZko1aGR0alB6LXptVjlqbVdoNHNLZ2REOW8ifX0sImV4cCI6MTc1MTEwNzI1NSwic3RhdHVzIjp7InN0YXR1c19hdHRlc3RhdGlvbiI6eyJjcmVkZW50aWFsX2hhc2hfYWxnIjoic2hhLTI1NiJ9fX0.1D871Dsx3hyv1-dRclyyW_kI5NOJlz33QZenJotGdNBbXe6-q-MaJ0HfibjAaGWBa98KvQADqiqkd3tHufpR_w~WyJybVRCMjBWc3JyY2p0NHdEMURTNUpBIiwiYmlydGhkYXRlIiwiMTk4NS0xMi0xMCJd~WyJTaU5EX2VycjVPQU9ObGJwUHE5NC1nIiwidW5pcXVlX2lkIiwiVElOSVQtTFZMREFBODVUNTBHNzAyQiJd~WyJEUS16QVVfekYtQnUyakxJYWJBTENBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1MVkxEQUE4NVQ1MEc3MDJCIl0~WyJ6X0Y2Q2hJTDRMTlQxUTRrcms1cC1BIiwiZ2l2ZW5fbmFtZSIsIkFkYSJd~WyI5M1YyS1lvMW1hNlNPVmRmTzd3VGRRIiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd~WyJ5ejdQOW5haFlGLXYtU2pXc0g0VC13IiwiaWF0IiwxNzE5NTcxMjU0XQ";

const unsigned =
  "eyJraWQiOiItRl82VWdhOG4zVmVnalkyVTdZVUhLMXpMb2FELU5QVGM2M1JNSVNuTGF3IiwidHlwIjoidmMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJfc2QiOlsiNmxmdUEyY2xrLXJpaGJGZkhCdDBOd0wwaFJQRXJ3cDZ2NFBTQVZLc24zSSIsIkFza2xIRzhlR0VXTkNXLXNQTEkzZnVLWkRsUVpjenlPTXprUE5KZG9DbnciLCJJVU01bVZzbzFOVjVqcUh4OE4wUWJXb09aNWlVQzN4eDM3RThrMHVDR2gwIiwiUkMyMGVEbmFpZHI1N2dZd0hLRDc4bUxTWEFqUkIzemZZNUM4QkZXX1RyWSIsIlNPb1dFU1RyYjJScHRNMTZTcnVoWFRaaFlxS0lpclI0Z3JYQlMzVTdQUkUiLCJUWEdla0g4cVl0QjNLLVBmVHZOSlFVOURFMk1JNGhHc05XY2REcHQyZm04Il0sInN1YiI6ImU3YzJlOTRjLWY3NDEtNGZmZS1hNjY4LTQ2ZWI3NDIxODNjYSIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwiaXNzIjoiaHR0cHM6Ly9wcmUuZWlkLndhbGxldC5pcHpzLml0IiwiY25mIjp7Imp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2Iiwia2lkIjoiekV2X3FHU0w1cjBfRjY3ajJkd0VnVUptQmdiTU5TRUo1S19pSDFQWWM3QSIsIngiOiIwUGo3dl9hZk5wOUVUSngxMUpiWWdrSTd5UXBkMHJ0aVl1bzVmZXVBTjJvIiwieSI6IlhCNjJVbTAydkhxZWRrT3pTZko1aGR0alB6LXptVjlqbVdoNHNLZ2REOW8ifX0sImV4cCI6MTc1MTEwNzI1NSwic3RhdHVzIjp7InN0YXR1c19hdHRlc3RhdGlvbiI6eyJjcmVkZW50aWFsX2hhc2hfYWxnIjoic2hhLTI1NiJ9fX0";

const signature =
  "1D871Dsx3hyv1-dRclyyW_kI5NOJlz33QZenJotGdNBbXe6-q-MaJ0HfibjAaGWBa98KvQADqiqkd3tHufpR_w";

const signed = `${unsigned}.${signature}`;

const tokenizedDisclosures = [
  "WyJybVRCMjBWc3JyY2p0NHdEMURTNUpBIiwiYmlydGhkYXRlIiwiMTk4NS0xMi0xMCJd",
  "WyJTaU5EX2VycjVPQU9ObGJwUHE5NC1nIiwidW5pcXVlX2lkIiwiVElOSVQtTFZMREFBODVUNTBHNzAyQiJd",
  "WyJEUS16QVVfekYtQnUyakxJYWJBTENBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1MVkxEQUE4NVQ1MEc3MDJCIl0",
  "WyJ6X0Y2Q2hJTDRMTlQxUTRrcms1cC1BIiwiZ2l2ZW5fbmFtZSIsIkFkYSJd",
  "WyI5M1YyS1lvMW1hNlNPVmRmTzd3VGRRIiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd",
  "WyJ5ejdQOW5haFlGLXYtU2pXc0g0VC13IiwiaWF0IiwxNzE5NTcxMjU0XQ",
];

const sdJwt = {
  header: {
    kid: "-F_6Uga8n3VegjY2U7YUHK1zLoaD-NPTc63RMISnLaw",
    typ: "vc+sd-jwt",
    alg: "ES256",
  },
  payload: {
    _sd: [
      "6lfuA2clk-rihbFfHBt0NwL0hRPErwp6v4PSAVKsn3I",
      "AsklHG8eGEWNCW-sPLI3fuKZDlQZczyOMzkPNJdoCnw",
      "IUM5mVso1NV5jqHx8N0QbWoOZ5iUC3xx37E8k0uCGh0",
      "RC20eDnaidr57gYwHKD78mLSXAjRB3zfY5C8BFW_TrY",
      "SOoWESTrb2RptM16SruhXTZhYqKIirR4grXBS3U7PRE",
      "TXGekH8qYtB3K-PfTvNJQU9DE2MI4hGsNWcdDpt2fm8",
    ],
    sub: "e7c2e94c-f741-4ffe-a668-46eb742183ca",
    _sd_alg: "sha-256",
    vct: "PersonIdentificationData",
    iss: "https://pre.eid.wallet.ipzs.it",
    cnf: {
      jwk: {
        kty: "EC",
        crv: "P-256",
        kid: "zEv_qGSL5r0_F67j2dwEgUJmBgbMNSEJ5K_iH1PYc7A",
        x: "0Pj7v_afNp9ETJx11JbYgkI7yQpd0rtiYuo5feuAN2o",
        y: "XB62Um02vHqedkOzSfJ5hdtjPz-zmV9jmWh4sKgdD9o",
      },
    },
    exp: 1751107255,
    status: {
      status_attestation: {
        credential_hash_alg: "sha-256",
      },
    },
  },
};

// In the very same order than tokenizedDisclosures
const disclosures = [
  ["rmTB20Vsrrcjt4wD1DS5JA", "birthdate", "1985-12-10"],
  ["SiND_err5OAONlbpPq94-g", "unique_id", "TINIT-LVLDAA85T50G702B"],
  ["DQ-zAU_zF-Bu2jLIabALCA", "tax_id_code", "TINIT-LVLDAA85T50G702B"],
  ["z_F6ChIL4LNT1Q4krk5p-A", "given_name", "Ada"],
  ["93V2KYo1ma6SOVdfO7wTdQ", "family_name", "Lovelace"],
  ["yz7P9nahYF-v-SjWsH4T-w", "iat", 1719571254],
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

  it("should decode with default decoder", () => {
    const result = decode(token);
    expect(result).toEqual({
      sdJwt,
      disclosures: disclosures.map((decoded, i) => ({
        decoded,
        encoded: tokenizedDisclosures[i],
      })),
    });
  });

  it("should accept only decoders that extend SdJwt4VC", () => {
    const validDecoder = SdJwt4VC.and(
      z.object({ payload: z.object({ customField: z.string() }) })
    );
    const invalidDecoder = z.object({
      payload: z.object({ customField: z.string() }),
    });

    try {
      // ts is fine
      decode(token, validDecoder);
      // @ts-expect-error break types
      decode(token, invalidDecoder);
    } catch (error) {
      // ignore actual result, just focus on types
      // spot the error during type checking phase
    }
  });
});

describe("disclose", () => {
  it("should encode a valid sdjwt (one claim)", async () => {
    const result = await disclose(token, ["given_name"]);
    const expected = {
      token: `${signed}~WyJ6X0Y2Q2hJTDRMTlQxUTRrcms1cC1BIiwiZ2l2ZW5fbmFtZSIsIkFkYSJd`,
      paths: [{ claim: "given_name", path: "verified_claims.claims._sd[5]" }],
    };

    expect(result).toEqual(expected);
  });

  it("should encode a valid sdjwt (no claims)", async () => {
    const result = await disclose(token, []);
    const expected = { token: `${signed}`, paths: [] };

    expect(result).toEqual(expected);
  });

  it("should encode a valid sdjwt (multiple claims)", async () => {
    const result = await disclose(token, ["iat", "family_name"]);
    const expected = {
      token: `${signed}~WyI5M1YyS1lvMW1hNlNPVmRmTzd3VGRRIiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd~WyJ5ejdQOW5haFlGLXYtU2pXc0g0VC13IiwiaWF0IiwxNzE5NTcxMjU0XQ`,
      paths: [
        {
          claim: "iat",
          path: "verified_claims.claims._sd[3]",
        },
        {
          claim: "family_name",
          path: "verified_claims.claims._sd[4]",
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
