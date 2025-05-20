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
  "eyJraWQiOiJvTHZHOHFGeGJZQ2RZRXBGNVdEeEJVYzM1THI1YTgwZ2FtbjZPeU5pSFRjIiwidHlwIjoidmMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJzdWIiOiJaTGJkSm53Qm1xQks2aVJqZmVmdXNqcjBZMUk1SE11MUllcXJ5TWJGejRnIiwidmN0IjoidXJuOmV1LmV1cm9wYS5lYy5ldWRpOnBpZDoxIiwiZXhwaXJ5X2RhdGUiOiIyMDI2LTA1LTIwIiwiaXNzIjoiaHR0cHM6Ly9hcGkucG90ZW50aWFsLXdhbGxldC1pdC1waWQtcHJvdmlkZXIuaXQiLCJfc2QiOlsiNDNlbk9MQ0xSdnhseDkyTG5QaUxOMTFMR3lIVjJtT1NycmRMa1RfTm1SQSIsIkdkc1hiX0s5ZHh5WWxCd3lCclloSVdVQnlSbFdxRk9IRlVWZ1J3RWZTdjQiLCJJaGgzUFRXbWM0Zk1MQ1FZQVFsN2l5ajRYY3RwbEZOS0VaUDVtQU9BWmo4IiwiTUx0RktpVUdzUDhrMUMxN3hYblZmWFh3emhpUHN0ekx4a2dLWk10YXZ1QSIsIlkxOU9vNFNfVjZEdjZRcGVPcFJSLWxOMmlGeHJ0RzF2WkVVejFKVy1CN2MiLCJ1LWlYMXduZUtja3NDeld6elRkOUZvUTlRUGNoNlhxS2hBZkMyRFZySk9zIiwid1FURHpYcFZpNmlVa01yUW9sNFdpWkpwZkhsS2FoZi1LLWxYZjE4Rll1YyIsInhqZzVNbEpXcDVqVGltdlhzaXZRUmhMVnFlOGNTemFkTVo2MEhrazUzanMiXSwidmN0I2ludGVncml0eSI6IjI0MjMwMmQ5N2QzOGRhMjcxNGEyNTdmMmEyNTNiZjJmYTMwYWFlNWMxMDlmZTk1ODFiZmNkYTNiMWQ3OTdjOTciLCJpc3N1aW5nX2NvdW50cnkiOiJJVCIsIl9zZF9hbGciOiJzaGEtMjU2IiwiaXNzdWluZ19hdXRob3JpdHkiOiJJc3RpdHV0byBQb2xpZ3JhZmljbyBlIFplY2NhIGRlbGxvIFN0YXRvIiwiY25mIjp7Imp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2Iiwia2lkIjoiTTBQYnZkWXNqVmdybWtXTTFfYVpZMk5zYmRMX3ZtckgyODd5TzQzTHF1WSIsIngiOiJfOHBuSVg2LXR6WEpBa0NSNmlhdnNDUVB0aW5ZYkZJeHI3NEYtNnJUejJVIiwieSI6IlJMeE53dHIxZzhIcmI1TlNoajFHYk1XZ0hvUS1DNzBCT3o0LVN5ZERoRmcifX0sImV4cCI6MTc3OTI4MzEyNSwiaWF0IjoxNzQ3NzQ3MTI1LCJ2ZXJpZmljYXRpb24iOnsiZXZpZGVuY2UiOnsibWV0aG9kIjoiY2llIn0sInRydXN0X2ZyYW1ld29yayI6ImVpZGFzIiwiYXNzdXJhbmNlX2xldmVsIjoiaGlnaCJ9LCJzdGF0dXMiOnsic3RhdHVzX2Fzc2VydGlvbiI6eyJjcmVkZW50aWFsX2hhc2hfYWxnIjoic2hhLTI1NiJ9fX0.guNNpF6KeKSowT6WCYvslgaPQbTRhwgqxTdJMPwsBOEkh6A9X2FvU8RMJoalhwXLHLo72bE4-HCvXO803I98JQ~WyItR0wxV1NiMnRWdTVTMDM4OXRFZW9nIiwiZ2l2ZW5fbmFtZSIsIk1BUklBIl0~WyJqSHYzdEFQNTNyRGxSbXVsdlo0Z2hBIiwiZmFtaWx5X25hbWUiLCJTUEVDSU1FTiJd~WyJiX3FtcnVBWTJkOEN5bk4yc0FPVm5nIiwidW5pcXVlX2lkIiwiaWRBTlBSIl0~WyJGajhqZ055bUVXYk9OdFpHeGV0SFh3IiwiYmlydGhfZGF0ZSIsIjE5OTUtMDEtMTgiXQ~WyI5aUs2UF9jY2UyY29QR1Q4b3d2TWxBIiwiYmlydGhfcGxhY2UiLCJST01BIl0~WyJucGVfcHJyUWxHT0hMU19pbS1pNmNnIiwibmF0aW9uYWxpdHkiLCJJVCJd~WyJrazlUVW9DQm9OZFd0VElpUWJValNBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1TUENNUkE5NUE1OEg1MDFUIl0~WyJjclNLNDlpaWpiZTdSbFFLSXlvcmlRIiwiaWF0IiwxNzQ3NzQ3MTI1XQ";

const unsigned =
  "eyJraWQiOiJvTHZHOHFGeGJZQ2RZRXBGNVdEeEJVYzM1THI1YTgwZ2FtbjZPeU5pSFRjIiwidHlwIjoidmMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJzdWIiOiJaTGJkSm53Qm1xQks2aVJqZmVmdXNqcjBZMUk1SE11MUllcXJ5TWJGejRnIiwidmN0IjoidXJuOmV1LmV1cm9wYS5lYy5ldWRpOnBpZDoxIiwiZXhwaXJ5X2RhdGUiOiIyMDI2LTA1LTIwIiwiaXNzIjoiaHR0cHM6Ly9hcGkucG90ZW50aWFsLXdhbGxldC1pdC1waWQtcHJvdmlkZXIuaXQiLCJfc2QiOlsiNDNlbk9MQ0xSdnhseDkyTG5QaUxOMTFMR3lIVjJtT1NycmRMa1RfTm1SQSIsIkdkc1hiX0s5ZHh5WWxCd3lCclloSVdVQnlSbFdxRk9IRlVWZ1J3RWZTdjQiLCJJaGgzUFRXbWM0Zk1MQ1FZQVFsN2l5ajRYY3RwbEZOS0VaUDVtQU9BWmo4IiwiTUx0RktpVUdzUDhrMUMxN3hYblZmWFh3emhpUHN0ekx4a2dLWk10YXZ1QSIsIlkxOU9vNFNfVjZEdjZRcGVPcFJSLWxOMmlGeHJ0RzF2WkVVejFKVy1CN2MiLCJ1LWlYMXduZUtja3NDeld6elRkOUZvUTlRUGNoNlhxS2hBZkMyRFZySk9zIiwid1FURHpYcFZpNmlVa01yUW9sNFdpWkpwZkhsS2FoZi1LLWxYZjE4Rll1YyIsInhqZzVNbEpXcDVqVGltdlhzaXZRUmhMVnFlOGNTemFkTVo2MEhrazUzanMiXSwidmN0I2ludGVncml0eSI6IjI0MjMwMmQ5N2QzOGRhMjcxNGEyNTdmMmEyNTNiZjJmYTMwYWFlNWMxMDlmZTk1ODFiZmNkYTNiMWQ3OTdjOTciLCJpc3N1aW5nX2NvdW50cnkiOiJJVCIsIl9zZF9hbGciOiJzaGEtMjU2IiwiaXNzdWluZ19hdXRob3JpdHkiOiJJc3RpdHV0byBQb2xpZ3JhZmljbyBlIFplY2NhIGRlbGxvIFN0YXRvIiwiY25mIjp7Imp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2Iiwia2lkIjoiTTBQYnZkWXNqVmdybWtXTTFfYVpZMk5zYmRMX3ZtckgyODd5TzQzTHF1WSIsIngiOiJfOHBuSVg2LXR6WEpBa0NSNmlhdnNDUVB0aW5ZYkZJeHI3NEYtNnJUejJVIiwieSI6IlJMeE53dHIxZzhIcmI1TlNoajFHYk1XZ0hvUS1DNzBCT3o0LVN5ZERoRmcifX0sImV4cCI6MTc3OTI4MzEyNSwiaWF0IjoxNzQ3NzQ3MTI1LCJ2ZXJpZmljYXRpb24iOnsiZXZpZGVuY2UiOnsibWV0aG9kIjoiY2llIn0sInRydXN0X2ZyYW1ld29yayI6ImVpZGFzIiwiYXNzdXJhbmNlX2xldmVsIjoiaGlnaCJ9LCJzdGF0dXMiOnsic3RhdHVzX2Fzc2VydGlvbiI6eyJjcmVkZW50aWFsX2hhc2hfYWxnIjoic2hhLTI1NiJ9fX0";

const signature =
  "guNNpF6KeKSowT6WCYvslgaPQbTRhwgqxTdJMPwsBOEkh6A9X2FvU8RMJoalhwXLHLo72bE4-HCvXO803I98JQ";

const signed = `${unsigned}.${signature}`;

const tokenizedDisclosures = [
  "WyItR0wxV1NiMnRWdTVTMDM4OXRFZW9nIiwiZ2l2ZW5fbmFtZSIsIk1BUklBIl0",
  "WyJqSHYzdEFQNTNyRGxSbXVsdlo0Z2hBIiwiZmFtaWx5X25hbWUiLCJTUEVDSU1FTiJd",
  "WyJiX3FtcnVBWTJkOEN5bk4yc0FPVm5nIiwidW5pcXVlX2lkIiwiaWRBTlBSIl0",
  "WyJGajhqZ055bUVXYk9OdFpHeGV0SFh3IiwiYmlydGhfZGF0ZSIsIjE5OTUtMDEtMTgiXQ",
  "WyI5aUs2UF9jY2UyY29QR1Q4b3d2TWxBIiwiYmlydGhfcGxhY2UiLCJST01BIl0",
  "WyJucGVfcHJyUWxHT0hMU19pbS1pNmNnIiwibmF0aW9uYWxpdHkiLCJJVCJd",
  "WyJrazlUVW9DQm9OZFd0VElpUWJValNBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1TUENNUkE5NUE1OEg1MDFUIl0",
  "WyJjclNLNDlpaWpiZTdSbFFLSXlvcmlRIiwiaWF0IiwxNzQ3NzQ3MTI1XQ",
];

const sdJwt = {
  header: {
    kid: "oLvG8qFxbYCdYEpF5WDxBUc35Lr5a80gamn6OyNiHTc",
    typ: "vc+sd-jwt",
    alg: "ES256",
  },
  payload: {
    sub: "ZLbdJnwBmqBK6iRjfefusjr0Y1I5HMu1IeqryMbFz4g",
    vct: "urn:eu.europa.ec.eudi:pid:1",
    expiry_date: "2026-05-20",
    iss: "https://api.potential-wallet-it-pid-provider.it",
    _sd: [
      "43enOLCLRvxlx92LnPiLN11LGyHV2mOSrrdLkT_NmRA",
      "GdsXb_K9dxyYlBwyBrYhIWUByRlWqFOHFUVgRwEfSv4",
      "Ihh3PTWmc4fMLCQYAQl7iyj4XctplFNKEZP5mAOAZj8",
      "MLtFKiUGsP8k1C17xXnVfXXwzhiPstzLxkgKZMtavuA",
      "Y19Oo4S_V6Dv6QpeOpRR-lN2iFxrtG1vZEUz1JW-B7c",
      "u-iX1wneKcksCzWzzTd9FoQ9QPch6XqKhAfC2DVrJOs",
      "wQTDzXpVi6iUkMrQol4WiZJpfHlKahf-K-lXf18FYuc",
      "xjg5MlJWp5jTimvXsivQRhLVqe8cSzadMZ60Hkk53js",
    ],
    "vct#integrity":
      "242302d97d38da2714a257f2a253bf2fa30aae5c109fe9581bfcda3b1d797c97",
    issuing_country: "IT",
    _sd_alg: "sha-256",
    issuing_authority: "Istituto Poligrafico e Zecca dello Stato",
    cnf: {
      jwk: {
        kty: "EC",
        crv: "P-256",
        kid: "M0PbvdYsjVgrmkWM1_aZY2NsbdL_vmrH287yO43LquY",
        x: "_8pnIX6-tzXJAkCR6iavsCQPtinYbFIxr74F-6rTz2U",
        y: "RLxNwtr1g8Hrb5NShj1GbMWgHoQ-C70BOz4-SydDhFg",
      },
    },
    exp: 1779283125,
    iat: 1747747125,
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
  ["-GL1WSb2tVu5S0389tEeog", "given_name", "MARIA"],
  ["jHv3tAP53rDlRmulvZ4ghA", "family_name", "SPECIMEN"],
  ["b_qmruAY2d8CynN2sAOVng", "unique_id", "idANPR"],
  ["Fj8jgNymEWbONtZGxetHXw", "birth_date", "1995-01-18"],
  ["9iK6P_cce2coPGT8owvMlA", "birth_place", "ROMA"],
  ["npe_prrQlGOHLS_im-i6cg", "nationality", "IT"],
  ["kk9TUoCBoNdWtTIiQbUjSA", "tax_id_code", "TINIT-SPCMRA95A58H501T"],
  ["crSK49iijbe7RlQKIyoriQ", "iat", 1747747125],
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
      token: `${signed}~WyJiX3FtcnVBWTJkOEN5bk4yc0FPVm5nIiwidW5pcXVlX2lkIiwiaWRBTlBSIl0`,
      paths: [{ claim: "unique_id", path: "verified_claims.claims._sd[7]" }],
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
      token: `${signed}~WyJqSHYzdEFQNTNyRGxSbXVsdlo0Z2hBIiwiZmFtaWx5X25hbWUiLCJTUEVDSU1FTiJd~WyJjclNLNDlpaWpiZTdSbFFLSXlvcmlRIiwiaWF0IiwxNzQ3NzQ3MTI1XQ`,
      paths: [
        {
          claim: "iat",
          path: "verified_claims.claims._sd[0]",
        },
        {
          claim: "family_name",
          path: "verified_claims.claims._sd[5]",
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
