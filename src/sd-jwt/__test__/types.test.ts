import { Disclosure, SdJwt4VC } from "../types";

describe("SdJwt4VC", () => {
  it("should accept a valid token", () => {
    // example provided at https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
    const token = {
      header: {
        typ: "vc+sd-jwt",
        alg: "RS512",
        kid: "dB67gL7ck3TFiIAf7N6_7SHvqk0MDYMEQcoGGlkUAAw",
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
        iss: "https://pidprovider.example.com",
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
