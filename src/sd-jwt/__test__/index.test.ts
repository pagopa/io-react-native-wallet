import { z } from "zod";
import { decode, disclose } from "../index";

import { encodeBase64, decodeBase64 } from "@pagopa/io-react-native-jwt";
import { SdJwt4VC } from "../types";
import { pid } from "../__mocks__/sd-jwt";

const { token, signed, tokenizedDisclosures } = pid;

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
