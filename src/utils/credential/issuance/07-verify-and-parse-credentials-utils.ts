import type {
  parseCredentialMDoc,
  parseCredentialSdJwt,
} from "src/credential/issuance/07-verify-and-parse-credential";

export type TestScenario<
  T extends object,
  R extends object,
  E extends Error,
> = {
  name: string;
  input: T;
  expected?: R;
  throws?: E;
};

export type ParseCredentialArg =
  | {
      format: "vc+sd-jwt";
      parameters: Parameters<typeof parseCredentialSdJwt>;
    }
  | {
      format: "mso_mdoc";
      parameters: Parameters<typeof parseCredentialMDoc>;
    };

export type ClaimsSdJwt =
  | Record<
      string,
      {
        display: {
          name: string;
          locale: string;
        }[];
        mandatory: boolean;
      }
    >
  | Record<
      string,
      Record<
        string,
        {
          display: {
            name: string;
            locale: string;
          }[];
          mandatory: boolean;
        }
      >
    >;

export type ClaimsMDOC = Record<
  string,
  {
    display: {
      name: string;
      locale: string;
    }[];
    mandatory: boolean;
  }
>;

export type ParseCredentialReturn = Record<
  string,
  {
    name?: string | Record<string, string>;
    value: unknown;
    mandatory?: boolean;
  }
>;

export function buildMockMDOCTestScenario(
  claims: ClaimsMDOC,
  nameSpaces: [string, any][]
): Parameters<typeof parseCredentialMDoc> {
  return [
    {
      "org.iso.18013.5.1.mDL": {
        cryptographic_suites_supported: [],
        cryptographic_binding_methods_supported: [],
        format: "mso_mdoc",
        display: [],
        claims: {
          "org.iso.18013.5.1": claims,
        },
      },
    },
    "org.iso.18013.5.1.mDL",
    {
      issuerSigned: {
        nameSpaces: {
          "org.iso.18013.5.1": nameSpaces.map((namespace) => ({
            elementIdentifier: namespace[0],
            elementValue: namespace[1],
          })),
        },
        issuerAuth: {
          unprotectedHeader: [],
          protectedHeader: "unused",
          payload: {
            validityInfo: {
              signed: new Date(2000, 2, 1),
              validFrom: new Date(2000, 2, 1),
              validUntil: new Date(2000, 2, 1),
            },
            deviceKeyInfo: {
              deviceKey: {
                kty: "EC",
                crv: "P-256",
                x: "unused",
                y: "unused",
              },
            },
            valueDigests: {},
          },
        },
      },
    },
    false,
    true,
  ];
}

export function buildMockSDJWTTestScenario(
  claims: ClaimsSdJwt,
  disclosures: [string, string, unknown][]
): Parameters<typeof parseCredentialSdJwt> {
  return [
    {
      dc_sd_jwt_PersonIdentificationData: {
        cryptographic_suites_supported: [],
        cryptographic_binding_methods_supported: [],
        format: "vc+sd-jwt",
        vct: "urn:eu.europa.ec.eudi:pid:1",
        display: [],
        claims,
      },
    },
    {
      sdJwt: {
        header: {
          typ: "vc+sd-jwt",
          alg: "unused",
        },
        payload: {
          status: {
            status_assertion: {
              credential_hash_alg: "sha-256",
            },
          },
          vct: "urn:eu.europa.ec.eudi:pid:1",
          iss: "unused",
          sub: "unused",
          expiry_date: "unused",
          issuing_authority: "unused",
          issuing_country: "unused",
          exp: 0,
          _sd_alg: "sha-256",
          cnf: {
            jwk: {
              kty: "RSA",
            },
          },
          _sd: [],
        },
      },
      disclosures,
    },
    false,
    true,
  ];
}
