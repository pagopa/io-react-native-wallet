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
