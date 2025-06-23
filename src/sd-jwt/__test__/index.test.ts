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
  "eyJraWQiOiItRl82VWdhOG4zVmVnalkyVTdZVUhLMXpMb2FELU5QVGM2M1JNSVNuTGF3IiwidHlwIjoiZGMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJfc2QiOlsiMHExRDVKbWF2NnBRYUVoX0pfRmN2X3VOTk1RSWdDeWhRT3hxbFk0bDNxVSIsIktDSi1BVk52ODhkLXhqNnNVSUFPSnhGbmJVaDNySFhES2tJSDFsRnFiUnMiLCJNOWxvOVl4RE5JWHJBcTJxV2VpQ0E0MHpwSl96WWZGZFJfNEFFQUxjUnRVIiwiY3pnalVrMG5xUkNzd1NoQ2hDamRTNkExLXY0N2RfcVRDU0ZJdklIaE1vSSIsIm5HblFyN2NsbTN0ZlRwOHlqTF91SHJEU090elIyUFZiOFM3R2VMZEFxQlEiLCJ4TklWd2xwU3NhWjhDSlNmMGd6NXhfNzVWUldXYzZWMW1scGVqZENycVVzIl0sInN1YiI6IjIxNmY4OTQ2LTllY2ItNDgxOS05MzA5LWMwNzZmMzRhN2UxMSIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwidmN0I2ludGVncml0eSI6IjEzZTI1ODg4YWM3YjhhM2E2ZDYxNDQwZGE3ODdmY2NjODE2NTRlNjEwODU3MzJiY2FjZDg5YjM2YWVjMzI2NzUiLCJpc3MiOiJodHRwczovL3ByZS5laWQud2FsbGV0LmlwenMuaXQiLCJpc3N1aW5nX2NvdW50cnkiOiJJVCIsImlzc3VpbmdfYXV0aG9yaXR5IjoiSXN0aXR1dG8gUG9saWdyYWZpY28gZSBaZWNjYSBkZWxsbyBTdGF0byIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsImtpZCI6IlJ2M1ctRWlLcHZCVHlrNXlaeHZyZXYtN01EQjZTbHpVQ0JvX0NRampkZFUiLCJ4IjoiMFdveDdRdHlQcUJ5ZzM1TUhfWHlDY25kNUxlLUptMEFYSGxVZ0RCQTAzWSIsInkiOiJlRWhWdmcxSlBxTmQzRFRTYTRtR0RHQmx3WTZOUC1FWmJMYk5GWFNYd0lnIn19LCJleHAiOjE3NTE1NDY1NzYsInN0YXR1cyI6eyJzdGF0dXNfYXNzZXJ0aW9uIjp7ImNyZWRlbnRpYWxfaGFzaF9hbGciOiJzaGEtMjU2In19fQ.XqB-0BJmBr5vwahsbsnE5oqrlxzvxHc-k2NZX93Z_gNMIj4ZqKe7g03r40VnbpfLd2exofd_XZRKtqF_EkFfZA~WyJrSkRFUDhFYU5URU1CRE9aelp6VDR3IiwidW5pcXVlX2lkIiwiVElOSVQtTFZMREFBODVUNTBHNzAyQiJd~WyJ6SUF5VUZ2UGZJcEUxekJxeEk1aGFRIiwiYmlydGhfZGF0ZSIsIjE5ODUtMTItMTAiXQ~WyJHcjNSM3MyOTBPa1FVbS1ORlR1OTZBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1MVkxEQUE4NVQ1MEc3MDJCIl0~WyJHeE9SYWxNQWVsZlowZWRGSmpqWVV3IiwiZ2l2ZW5fbmFtZSIsIkFkYSJd~WyJfdlY1UklrbDBJT0VYS290czlrdDF3IiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd~WyJDajV0Y2NSNzJKd3J6ZTJUVzRhLXdnIiwiaWF0IiwxNzIwMDEwNTc1XQ";

const unsigned =
  "eyJraWQiOiItRl82VWdhOG4zVmVnalkyVTdZVUhLMXpMb2FELU5QVGM2M1JNSVNuTGF3IiwidHlwIjoiZGMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJfc2QiOlsiMHExRDVKbWF2NnBRYUVoX0pfRmN2X3VOTk1RSWdDeWhRT3hxbFk0bDNxVSIsIktDSi1BVk52ODhkLXhqNnNVSUFPSnhGbmJVaDNySFhES2tJSDFsRnFiUnMiLCJNOWxvOVl4RE5JWHJBcTJxV2VpQ0E0MHpwSl96WWZGZFJfNEFFQUxjUnRVIiwiY3pnalVrMG5xUkNzd1NoQ2hDamRTNkExLXY0N2RfcVRDU0ZJdklIaE1vSSIsIm5HblFyN2NsbTN0ZlRwOHlqTF91SHJEU090elIyUFZiOFM3R2VMZEFxQlEiLCJ4TklWd2xwU3NhWjhDSlNmMGd6NXhfNzVWUldXYzZWMW1scGVqZENycVVzIl0sInN1YiI6IjIxNmY4OTQ2LTllY2ItNDgxOS05MzA5LWMwNzZmMzRhN2UxMSIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwidmN0I2ludGVncml0eSI6IjEzZTI1ODg4YWM3YjhhM2E2ZDYxNDQwZGE3ODdmY2NjODE2NTRlNjEwODU3MzJiY2FjZDg5YjM2YWVjMzI2NzUiLCJpc3MiOiJodHRwczovL3ByZS5laWQud2FsbGV0LmlwenMuaXQiLCJpc3N1aW5nX2NvdW50cnkiOiJJVCIsImlzc3VpbmdfYXV0aG9yaXR5IjoiSXN0aXR1dG8gUG9saWdyYWZpY28gZSBaZWNjYSBkZWxsbyBTdGF0byIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsImtpZCI6IlJ2M1ctRWlLcHZCVHlrNXlaeHZyZXYtN01EQjZTbHpVQ0JvX0NRampkZFUiLCJ4IjoiMFdveDdRdHlQcUJ5ZzM1TUhfWHlDY25kNUxlLUptMEFYSGxVZ0RCQTAzWSIsInkiOiJlRWhWdmcxSlBxTmQzRFRTYTRtR0RHQmx3WTZOUC1FWmJMYk5GWFNYd0lnIn19LCJleHAiOjE3NTE1NDY1NzYsInN0YXR1cyI6eyJzdGF0dXNfYXNzZXJ0aW9uIjp7ImNyZWRlbnRpYWxfaGFzaF9hbGciOiJzaGEtMjU2In19fQ";

const signature =
  "XqB-0BJmBr5vwahsbsnE5oqrlxzvxHc-k2NZX93Z_gNMIj4ZqKe7g03r40VnbpfLd2exofd_XZRKtqF_EkFfZA";

const signed = `${unsigned}.${signature}`;

const tokenizedDisclosures = [
  "WyJrSkRFUDhFYU5URU1CRE9aelp6VDR3IiwidW5pcXVlX2lkIiwiVElOSVQtTFZMREFBODVUNTBHNzAyQiJd",
  "WyJ6SUF5VUZ2UGZJcEUxekJxeEk1aGFRIiwiYmlydGhfZGF0ZSIsIjE5ODUtMTItMTAiXQ",
  "WyJHcjNSM3MyOTBPa1FVbS1ORlR1OTZBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1MVkxEQUE4NVQ1MEc3MDJCIl0",
  "WyJHeE9SYWxNQWVsZlowZWRGSmpqWVV3IiwiZ2l2ZW5fbmFtZSIsIkFkYSJd",
  "WyJfdlY1UklrbDBJT0VYS290czlrdDF3IiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd",
  "WyJDajV0Y2NSNzJKd3J6ZTJUVzRhLXdnIiwiaWF0IiwxNzIwMDEwNTc1XQ",
];

const sdJwt = {
  header: {
    kid: "-F_6Uga8n3VegjY2U7YUHK1zLoaD-NPTc63RMISnLaw",
    typ: "dc+sd-jwt",
    alg: "ES256",
  },
  payload: {
    _sd: [
      "0q1D5Jmav6pQaEh_J_Fcv_uNNMQIgCyhQOxqlY4l3qU",
      "KCJ-AVNv88d-xj6sUIAOJxFnbUh3rHXDKkIH1lFqbRs",
      "M9lo9YxDNIXrAq2qWeiCA40zpJ_zYfFdR_4AEALcRtU",
      "czgjUk0nqRCswShChCjdS6A1-v47d_qTCSFIvIHhMoI",
      "nGnQr7clm3tfTp8yjL_uHrDSOtzR2PVb8S7GeLdAqBQ",
      "xNIVwlpSsaZ8CJSf0gz5x_75VRWWc6V1mlpejdCrqUs",
    ],
    sub: "216f8946-9ecb-4819-9309-c076f34a7e11",
    _sd_alg: "sha-256",
    vct: "PersonIdentificationData",
    "vct#integrity":
      "13e25888ac7b8a3a6d61440da787fccc81654e61085732bcacd89b36aec32675",
    iss: "https://pre.eid.wallet.ipzs.it",
    issuing_country: "IT",
    issuing_authority: "Istituto Poligrafico e Zecca dello Stato",
    cnf: {
      jwk: {
        kty: "EC",
        crv: "P-256",
        kid: "Rv3W-EiKpvBTyk5yZxvrev-7MDB6SlzUCBo_CQjjddU",
        x: "0Wox7QtyPqByg35MH_XyCcnd5Le-Jm0AXHlUgDBA03Y",
        y: "eEhVvg1JPqNd3DTSa4mGDGBlwY6NP-EZbLbNFXSXwIg",
      },
    },
    exp: 1751546576,
    status: {
      status_assertion: {
        credential_hash_alg: "sha-256",
      },
    },
  },
};

// In the very same order than tokenizedDisclosures
const disclosures = [
  ["kJDEP8EaNTEMBDOZzZzT4w", "unique_id", "TINIT-LVLDAA85T50G702B"],
  ["zIAyUFvPfIpE1zBqxI5haQ", "birth_date", "1985-12-10"],
  ["Gr3R3s290OkQUm-NFTu96A", "tax_id_code", "TINIT-LVLDAA85T50G702B"],
  ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
  ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
  ["Cj5tccR72Jwrze2TW4a-wg", "iat", 1720010575],
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
      token: `${signed}~WyJHeE9SYWxNQWVsZlowZWRGSmpqWVV3IiwiZ2l2ZW5fbmFtZSIsIkFkYSJd`,
      paths: [{ claim: "given_name", path: "verified_claims.claims._sd[3]" }],
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
      token: `${signed}~WyJfdlY1UklrbDBJT0VYS290czlrdDF3IiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd~WyJDajV0Y2NSNzJKd3J6ZTJUVzRhLXdnIiwiaWF0IiwxNzIwMDEwNTc1XQ`,
      paths: [
        {
          claim: "iat",
          path: "verified_claims.claims._sd[4]",
        },
        {
          claim: "family_name",
          path: "verified_claims.claims._sd[0]",
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
