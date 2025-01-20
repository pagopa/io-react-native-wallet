import { Disclosure, SdJwt4VC } from "../types";

describe("SdJwt4VC", () => {
  it("should accept a valid token", () => {
    // example provided at https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
    const token = {
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

    const { success } = SdJwt4VC.safeParse(token);

    expect(success).toBe(true);
  });
});

describe("Disclosure", () => {
  it("should accept a valid disclosure", () => {
    // example provided at https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
    const value = [
      "2GLC42sKQveCfGfryNRN9w",
      "evidence",
      [
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
    ];

    const { success } = Disclosure.safeParse(value);
    expect(success).toBe(true);
  });
});
