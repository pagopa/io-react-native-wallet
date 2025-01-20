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
  "eyJraWQiOiJlTk4tZzVpNkNuTEtjbHRRQnA2YWJiaW9HTWJ6TTZtdVczdnV4dzZ1aDg4IiwidHlwIjoidmMrc2Qtand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJzajFPcFlpaUxUVllBTm5CR053U0sya3JNd3FwV2F6MmlIbU4xdDBfRXNnIiwiX3NkIjpbIjFVbXRJU3NkZDd1ZGJGYUZ5LVZpWjhkWkZoZXJiT0dEMk4zSGxYNFBJQzgiLCJGbWpzNHF6YzV2a2VPQVk1RzIwX1pQdlUtMXEtb1hhVjdBeDUxNkNDTUZrIiwiUTNiYWdOek1lUWg2RWd3UEJTSGltYmdRcGxtWV82djlTVzRnbzJYQWtnQSIsIlFWd2tuNzFCNHBXZkNPenpsUWw5SG54RlNWZEVIdVczNXpkVFFRZEZRR2MiLCJWVmRSNDFBMktPT1Z6eFlhZ1pDR2JWYW5nN3NTa2VnQ2VpdVdmM0RPdGpzIiwidk8yZHZuY216bHYzN01Ra21XdWRTRElIREU5WUhkMEVGQjh4QlREVmp6MCJdLCJ2Y3QjaW50ZWdyaXR5IjoiMjQyMzAyZDk3ZDM4ZGEyNzE0YTI1N2YyYTI1M2JmMmZhMzBhYWU1YzEwOWZlOTU4MWJmY2RhM2IxZDc5N2M5NyIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoidXJuOmV1LmV1cm9wYS5lYy5ldWRpOnBpZDoxIiwiaXNzIjoiaHR0cHM6Ly9hcGkucG90ZW50aWFsLXdhbGxldC1pdC1waWQtcHJvdmlkZXIuaXQiLCJjbmYiOnsiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJraWQiOiJMZWduRlE4bHZoQTZxeVB1dFl2NDhuV1dwU25PNXRIaWdhdnl3eWRzNVMwIiwieCI6ImN6WnJOOWxjTnVjMHE2OVg0MG4yN2M1aktwaWkwQS1hWVhfUGJvOXBxQlEiLCJ5IjoiWUdLR2FDSk5XZlRpS2l6M0ptQUc5a3k3aDR0d1B1VWZ6WU9neTFiekx2OCJ9fSwiZXhwIjoxNzY4NDkwMTk2LCJpYXQiOjE3MzY5NTQxOTYsInZlcmlmaWNhdGlvbiI6eyJldmlkZW5jZSI6eyJtZXRob2QiOiJjaWUifSwidHJ1c3RfZnJhbWV3b3JrIjoiZWlkYXMiLCJhc3N1cmFuY2VfbGV2ZWwiOiJoaWdoIn0sInN0YXR1cyI6eyJzdGF0dXNfYXNzZXJ0aW9uIjp7ImNyZWRlbnRpYWxfaGFzaF9hbGciOiJzaGEtMjU2In19fQ.bDBz9xa_u1g27TEuGRjNdFCMXuVibXHeI-rpnSZ_NE7k2h4_Kcshk1Van-ttmJiDq3XFBGckl3nka_QVsMjaRMnURQP62URci3CCaFZUVu3zI4BsXp1oRhucPqq6BHl6sjZbDXALp2jViEQ862-frdFnCCEuQC0xMh-zYycpL60bHXHTaGYDzHafGQAwcwr3fyYwFZvfmLFEBoKmEawDrFC0Enfw7pE9EHP9jITxWRTIxn9NcVdnzki1FO-ERsjrDS2y-u2RK6uy6-_0kIx-1mDJ7krCkaxeol0zOLb7zJX8ooxC1QupSp1z457JKi7cPPoL1GWeTRoHFy_kZL_Jew~WyJacnBvZllXMWs2NEpuUE05WjdEWS1RIiwiZ2l2ZW5fbmFtZSIsIk1hcmlvIl0~WyJ4d0o1UWM2OTB1eEgyZ0VKMHFDV2dRIiwiZmFtaWx5X25hbWUiLCJSb3NzaSJd~WyJlV3ZwQXAtVkFHM0tBdkVGTEgxRGZ3IiwidW5pcXVlX2lkIiwiaWRBTlBSIl0~WyJHcXZJTzV5SVN3bjg4eDkzbE1aalpRIiwiYmlydGhkYXRlIiwiMTk4MC0xMC0wMSJd~WyJvUmprWWxPc1JvSGZ4eEh2WmZueDN3IiwidGF4X2lkX2NvZGUiLCJUSU5JVC1SU1NNUkE4MEExMEg1MDFBIl0~WyJzOXBvSENQcW83cVdsb3BkQXRZc0V3IiwiaWF0IiwxNzM2OTU0MTk2XQ";

const unsigned =
  "eyJraWQiOiJlTk4tZzVpNkNuTEtjbHRRQnA2YWJiaW9HTWJ6TTZtdVczdnV4dzZ1aDg4IiwidHlwIjoidmMrc2Qtand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJzajFPcFlpaUxUVllBTm5CR053U0sya3JNd3FwV2F6MmlIbU4xdDBfRXNnIiwiX3NkIjpbIjFVbXRJU3NkZDd1ZGJGYUZ5LVZpWjhkWkZoZXJiT0dEMk4zSGxYNFBJQzgiLCJGbWpzNHF6YzV2a2VPQVk1RzIwX1pQdlUtMXEtb1hhVjdBeDUxNkNDTUZrIiwiUTNiYWdOek1lUWg2RWd3UEJTSGltYmdRcGxtWV82djlTVzRnbzJYQWtnQSIsIlFWd2tuNzFCNHBXZkNPenpsUWw5SG54RlNWZEVIdVczNXpkVFFRZEZRR2MiLCJWVmRSNDFBMktPT1Z6eFlhZ1pDR2JWYW5nN3NTa2VnQ2VpdVdmM0RPdGpzIiwidk8yZHZuY216bHYzN01Ra21XdWRTRElIREU5WUhkMEVGQjh4QlREVmp6MCJdLCJ2Y3QjaW50ZWdyaXR5IjoiMjQyMzAyZDk3ZDM4ZGEyNzE0YTI1N2YyYTI1M2JmMmZhMzBhYWU1YzEwOWZlOTU4MWJmY2RhM2IxZDc5N2M5NyIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoidXJuOmV1LmV1cm9wYS5lYy5ldWRpOnBpZDoxIiwiaXNzIjoiaHR0cHM6Ly9hcGkucG90ZW50aWFsLXdhbGxldC1pdC1waWQtcHJvdmlkZXIuaXQiLCJjbmYiOnsiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJraWQiOiJMZWduRlE4bHZoQTZxeVB1dFl2NDhuV1dwU25PNXRIaWdhdnl3eWRzNVMwIiwieCI6ImN6WnJOOWxjTnVjMHE2OVg0MG4yN2M1aktwaWkwQS1hWVhfUGJvOXBxQlEiLCJ5IjoiWUdLR2FDSk5XZlRpS2l6M0ptQUc5a3k3aDR0d1B1VWZ6WU9neTFiekx2OCJ9fSwiZXhwIjoxNzY4NDkwMTk2LCJpYXQiOjE3MzY5NTQxOTYsInZlcmlmaWNhdGlvbiI6eyJldmlkZW5jZSI6eyJtZXRob2QiOiJjaWUifSwidHJ1c3RfZnJhbWV3b3JrIjoiZWlkYXMiLCJhc3N1cmFuY2VfbGV2ZWwiOiJoaWdoIn0sInN0YXR1cyI6eyJzdGF0dXNfYXNzZXJ0aW9uIjp7ImNyZWRlbnRpYWxfaGFzaF9hbGciOiJzaGEtMjU2In19fQ";

const signature =
  "bDBz9xa_u1g27TEuGRjNdFCMXuVibXHeI-rpnSZ_NE7k2h4_Kcshk1Van-ttmJiDq3XFBGckl3nka_QVsMjaRMnURQP62URci3CCaFZUVu3zI4BsXp1oRhucPqq6BHl6sjZbDXALp2jViEQ862-frdFnCCEuQC0xMh-zYycpL60bHXHTaGYDzHafGQAwcwr3fyYwFZvfmLFEBoKmEawDrFC0Enfw7pE9EHP9jITxWRTIxn9NcVdnzki1FO-ERsjrDS2y-u2RK6uy6-_0kIx-1mDJ7krCkaxeol0zOLb7zJX8ooxC1QupSp1z457JKi7cPPoL1GWeTRoHFy_kZL_Jew";

const signed = `${unsigned}.${signature}`;

const tokenizedDisclosures = [
  "WyJacnBvZllXMWs2NEpuUE05WjdEWS1RIiwiZ2l2ZW5fbmFtZSIsIk1hcmlvIl0",
  "WyJ4d0o1UWM2OTB1eEgyZ0VKMHFDV2dRIiwiZmFtaWx5X25hbWUiLCJSb3NzaSJd",
  "WyJlV3ZwQXAtVkFHM0tBdkVGTEgxRGZ3IiwidW5pcXVlX2lkIiwiaWRBTlBSIl0",
  "WyJHcXZJTzV5SVN3bjg4eDkzbE1aalpRIiwiYmlydGhkYXRlIiwiMTk4MC0xMC0wMSJd",
  "WyJvUmprWWxPc1JvSGZ4eEh2WmZueDN3IiwidGF4X2lkX2NvZGUiLCJUSU5JVC1SU1NNUkE4MEExMEg1MDFBIl0",
  "WyJzOXBvSENQcW83cVdsb3BkQXRZc0V3IiwiaWF0IiwxNzM2OTU0MTk2XQ",
];

const sdJwt = {
  header: {
    kid: "eNN-g5i6CnLKcltQBp6abbioGMbzM6muW3vuxw6uh88",
    typ: "vc+sd-jwt",
    alg: "RS256",
  },
  payload: {
    sub: "sj1OpYiiLTVYANnBGNwSK2krMwqpWaz2iHmN1t0_Esg",
    _sd: [
      "1UmtISsdd7udbFaFy-ViZ8dZFherbOGD2N3HlX4PIC8",
      "Fmjs4qzc5vkeOAY5G20_ZPvU-1q-oXaV7Ax516CCMFk",
      "Q3bagNzMeQh6EgwPBSHimbgQplmY_6v9SW4go2XAkgA",
      "QVwkn71B4pWfCOzzlQl9HnxFSVdEHuW35zdTQQdFQGc",
      "VVdR41A2KOOVzxYagZCGbVang7sSkegCeiuWf3DOtjs",
      "vO2dvncmzlv37MQkmWudSDIHDE9YHd0EFB8xBTDVjz0",
    ],
    "vct#integrity":
      "242302d97d38da2714a257f2a253bf2fa30aae5c109fe9581bfcda3b1d797c97",
    _sd_alg: "sha-256",
    vct: "urn:eu.europa.ec.eudi:pid:1",
    iss: "https://api.potential-wallet-it-pid-provider.it",
    cnf: {
      jwk: {
        kty: "EC",
        crv: "P-256",
        kid: "LegnFQ8lvhA6qyPutYv48nWWpSnO5tHigavywyds5S0",
        x: "czZrN9lcNuc0q69X40n27c5jKpii0A-aYX_Pbo9pqBQ",
        y: "YGKGaCJNWfTiKiz3JmAG9ky7h4twPuUfzYOgy1bzLv8",
      },
    },
    exp: 1768490196,
    iat: 1736954196,
    verification: {
      evidence: {
        method: "cie",
      },
      trust_framework: "eidas",
      assurance_level: "high",
    },
    status: {
      status_assertion: {
        credential_hash_alg: "sha-256",
      },
    },
  },
};

// In the very same order than tokenizedDisclosures
const disclosures = [
  ["ZrpofYW1k64JnPM9Z7DY-Q", "given_name", "Mario"],
  ["xwJ5Qc690uxH2gEJ0qCWgQ", "family_name", "Rossi"],
  ["eWvpAp-VAG3KAvEFLH1Dfw", "unique_id", "idANPR"],
  ["GqvIO5yISwn88x93lMZjZQ", "birthdate", "1980-10-01"],
  ["oRjkYlOsRoHfxxHvZfnx3w", "tax_id_code", "TINIT-RSSMRA80A10H501A"],
  ["s9poHCPqo7qWlopdAtYsEw", "iat", 1736954196],
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
    const result = await disclose(token, ["unique_id"]);
    const expected = {
      token: `${signed}~WyJlV3ZwQXAtVkFHM0tBdkVGTEgxRGZ3IiwidW5pcXVlX2lkIiwiaWRBTlBSIl0`,
      paths: [{ claim: "unique_id", path: "verified_claims.claims._sd[5]" }],
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
      token: `${signed}~WyJ4d0o1UWM2OTB1eEgyZ0VKMHFDV2dRIiwiZmFtaWx5X25hbWUiLCJSb3NzaSJd~WyJzOXBvSENQcW83cVdsb3BkQXRZc0V3IiwiaWF0IiwxNzM2OTU0MTk2XQ`,
      paths: [
        {
          claim: "iat",
          path: "verified_claims.claims._sd[1]",
        },
        {
          claim: "family_name",
          path: "verified_claims.claims._sd[3]",
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
