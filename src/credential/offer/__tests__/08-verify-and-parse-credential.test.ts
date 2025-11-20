import { parseCredentialSdJwt } from "../08-verify-and-parse-credential";
import type { SdJwtDecoded } from "../types";

describe("parseCredentialSdJwt - eu.europa.ec.eudi.pid_vc_sd_jwt", () => {
  it("parsa correttamente la credential di esempio", () => {
    const decoded = {
      jwt: {
        header: {
          alg: "ES256",
          typ: "dc+sd-jwt",
          x5c: [
            "MIIC3zCCAoWgAwIBAgIUf3lohTmDMAmS/YX/q4hqoRyJB54wCgYIKoZIzj0EAwIwXDEeMBwGA1UEAwwVUElEIElzc3VlciBDQSAtIFVUIDAyMS0wKwYDVQQKDCRFVURJIFdhbGxldCBSZWZlcmVuY2UgSW1wbGVtZW50YXRpb24xCzAJBgNVBAYTAlVUMB4XDTI1MDQxMDE0Mzc1MloXDTI2MDcwNDE0Mzc1MVowUjEUMBIGA1UEAwwLUElEIERTIC0gMDExLTArBgNVBAoMJEVVREkgV2FsbGV0IFJlZmVyZW5jZSBJbXBsZW1lbnRhdGlvbjELMAkGA1UEBhMCVVQwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAS7WAAWqPze0Us3z8pajyVPWBRmrRbCi5X2s9GvlybQytwTumcZnej9BkLfAglloX5tv+NgWfDfgt/06s+5tV4lo4IBLTCCASkwHwYDVR0jBBgwFoAUYseURyi9D6IWIKeawkmURPEB08cwGwYDVR0RBBQwEoIQaXNzdWVyLmV1ZGl3LmRldjAWBgNVHSUBAf8EDDAKBggrgQICAAABAjBDBgNVHR8EPDA6MDigNqA0hjJodHRwczovL3ByZXByb2QucGtpLmV1ZGl3LmRldi9jcmwvcGlkX0NBX1VUXzAyLmNybDAdBgNVHQ4EFgQUql/opxkQlYy0llaToPbDE/myEcEwDgYDVR0PAQH/BAQDAgeAMF0GA1UdEgRWMFSGUmh0dHBzOi8vZ2l0aHViLmNvbS9ldS1kaWdpdGFsLWlkZW50aXR5LXdhbGxldC9hcmNoaXRlY3R1cmUtYW5kLXJlZmVyZW5jZS1mcmFtZXdvcmswCgYIKoZIzj0EAwIDSAAwRQIhANJVSDsqT3IkGcKWWgSeubkDOdi5/UE9b1GF/X5fQRFaAiBp5t6tHh8XwFhPstzOHMopvBD/Gwms0RAUgmSn6ku8Gg==",
          ],
        },
        payload: {
          iss: "https://backend.issuer.eudiw.dev",
          iat: 1763510400,
          exp: 1771286400,
          vct: "urn:eudi:pid:1",
          _sd_alg: "sha-256",
          _sd: [
            "44A9K0xFo20y-Mz3r3habfAPGFfkUWVtBoU-JjBEXSk",
            "6Kt7nkUnI2NDiIgrMfc9BXG85TlvSM0B7DxG-Fv790c",
            "6Ql7515vqoL644UTcOYEwH-itH1VxsGphSbpvoAxhzw",
            "_cc9-ZJA2ftNwHCil2X-xJc_GFfz-sYnDexUiJReQOU",
            "cGILCy1DsR8zc7e_f-r2FLeouHo2fUhfK6PnQKBsH74",
            "if5UXnHkf-pnOQF1mCgXcND4sh57liCXsQ3EqWOzJWQ",
            "on2D81aVlJ1R9TOA1ZQhpMRLvChM9PXm2W2niod9HHw",
            "qgFOH2ecWBUrwjjcrCMVA5oZ46GkzivikBMf-Rigu1k",
            "y60gDOZD1sVcH-WrnrJA_k4toILiCUiZ8cl5vUC2V58",
            "zCR3V5iQkcfnqSh3KzvRtsSzPAjFNEgK5dk1NmRq-s8",
          ],
          cnf: {
            jwk: {
              kty: "EC",
              crv: "P-256",
              x: "R-02uYtNywD9t5cAp7WharnKvwm6y8YlQDQW1C9wj5E",
              y: "UMxPVFknVllAVgME-xYUfwT2RiaP9qZJnodwCZafwI0",
            },
          },
          status: {
            identifier_list: {
              id: "5306",
              uri: "https://issuer.eudiw.dev/identifier_list/FC/eu.europa.ec.eudi.pid.1/90b5bcd5-6289-4a12-b482-7633f2a0f011",
            },
            status_list: {
              idx: 5306,
              uri: "https://issuer.eudiw.dev/token_status_list/FC/eu.europa.ec.eudi.pid.1/90b5bcd5-6289-4a12-b482-7633f2a0f011",
            },
          },
        },
        signature:
          "WL19-gehYajMH5sCSeJZFOsU7tRd91-CFxoI_Uxhb0LAS31Y5bAbsS6IGAlEljhtMkC2brRu_D3pA1rMDk0bFA",
        encoded:
          "eyJhbGciOiAiRVMyNTYiLCAidHlwIjogImRjK3NkLWp3dCIsICJ4NWMiOiBbIk1JSUMzekNDQW9XZ0F3SUJBZ0lVZjNsb2hUbURNQW1TL1lYL3E0aHFvUnlKQjU0d0NnWUlLb1pJemowRUF3SXdYREVlTUJ3R0ExVUVBd3dWVUVsRUlFbHpjM1ZsY2lCRFFTQXRJRlZVSURBeU1TMHdLd1lEVlFRS0RDUkZWVVJKSUZkaGJHeGxkQ0JTWldabGNtVnVZMlVnU1cxd2JHVnRaVzUwWVhScGIyNHhDekFKQmdOVkJBWVRBbFZVTUI0WERUSTFNRFF4TURFME16YzFNbG9YRFRJMk1EY3dOREUwTXpjMU1Wb3dVakVVTUJJR0ExVUVBd3dMVUVsRUlFUlRJQzBnTURFeExUQXJCZ05WQkFvTUpFVlZSRWtnVjJGc2JHVjBJRkpsWm1WeVpXNWpaU0JKYlhCc1pXMWxiblJoZEdsdmJqRUxNQWtHQTFVRUJoTUNWVlF3V1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVM3V0FBV3FQemUwVXMzejhwYWp5VlBXQlJtclJiQ2k1WDJzOUd2bHliUXl0d1R1bWNabmVqOUJrTGZBZ2xsb1g1dHYrTmdXZkRmZ3QvMDZzKzV0VjRsbzRJQkxUQ0NBU2t3SHdZRFZSMGpCQmd3Rm9BVVlzZVVSeWk5RDZJV0lLZWF3a21VUlBFQjA4Y3dHd1lEVlIwUkJCUXdFb0lRYVhOemRXVnlMbVYxWkdsM0xtUmxkakFXQmdOVkhTVUJBZjhFRERBS0JnZ3JnUUlDQUFBQkFqQkRCZ05WSFI4RVBEQTZNRGlnTnFBMGhqSm9kSFJ3Y3pvdkwzQnlaWEJ5YjJRdWNHdHBMbVYxWkdsM0xtUmxkaTlqY213dmNHbGtYME5CWDFWVVh6QXlMbU55YkRBZEJnTlZIUTRFRmdRVXFsL29weGtRbFl5MGxsYVRvUGJERS9teUVjRXdEZ1lEVlIwUEFRSC9CQVFEQWdlQU1GMEdBMVVkRWdSV01GU0dVbWgwZEhCek9pOHZaMmwwYUhWaUxtTnZiUzlsZFMxa2FXZHBkR0ZzTFdsa1pXNTBhWFI1TFhkaGJHeGxkQzloY21Ob2FYUmxZM1IxY21VdFlXNWtMWEpsWm1WeVpXNWpaUzFtY21GdFpYZHZjbXN3Q2dZSUtvWkl6ajBFQXdJRFNBQXdSUUloQU5KVlNEc3FUM0lrR2NLV1dnU2V1YmtET2RpNS9VRTliMUdGL1g1ZlFSRmFBaUJwNXQ2dEhoOFh3RmhQc3R6T0hNb3B2QkQvR3dtczBSQVVnbVNuNmt1OEdnPT0iXX0.eyJfc2QiOiBbIjQ0QTlLMHhGbzIweS1NejNyM2hhYmZBUEdGZmtVV1Z0Qm9VLUpqQkVYU2siLCAiNkt0N25rVW5JMk5EaUlnck1mYzlCWEc4NVRsdlNNMEI3RHhHLUZ2NzkwYyIsICI2UWw3NTE1dnFvTDY0NFVUY09ZRXdILWl0SDFWeHNHcGhTYnB2b0F4aHp3IiwgIl9jYzktWkpBMmZ0TndIQ2lsMlgteEpjX0dGZnotc1luRGV4VWlKUmVRT1UiLCAiY0dJTEN5MURzUjh6YzdlX2YtcjJGTGVvdUhvMmZVaGZLNlBuUUtCc0g3NCIsICJpZjVVWG5Ia2YtcG5PUUYxbUNnWGNORDRzaDU3bGlDWHNRM0VxV096SldRIiwgIm9uMkQ4MWFWbEoxUjlUT0ExWlFocE1STHZDaE05UFhtMlcybmlvZDlISHciLCAicWdGT0gyZWNXQlVyd2pqY3JDTVZBNW9aNDZHa3ppdmlrQk1mLVJpZ3UxayIsICJ5NjBnRE9aRDFzVmNILVdybnJKQV9rNHRvSUxpQ1VpWjhjbDV2VUMyVjU4IiwgInpDUjNWNWlRa2NmbnFTaDNLenZSdHNTelBBakZORWdLNWRrMU5tUnEtczgiXSwgImlzcyI6ICJodHRwczovL2JhY2tlbmQuaXNzdWVyLmV1ZGl3LmRldiIsICJpYXQiOiAxNzYzNTEwNDAwLCAiZXhwIjogMTc3MTI4NjQwMCwgInZjdCI6ICJ1cm46ZXVkaTpwaWQ6MSIsICJzdGF0dXMiOiB7ImlkZW50aWZpZXJfbGlzdCI6IHsiaWQiOiAiNTMwNiIsICJ1cmkiOiAiaHR0cHM6Ly9pc3N1ZXIuZXVkaXcuZGV2L2lkZW50aWZpZXJfbGlzdC9GQy9ldS5ldXJvcGEuZWMuZXVkaS5waWQuMS85MGI1YmNkNS02Mjg5LTRhMTItYjQ4Mi03NjMzZjJhMGYwMTEifSwgInN0YXR1c19saXN0IjogeyJpZHgiOiA1MzA2LCAidXJpIjogImh0dHBzOi8vaXNzdWVyLmV1ZGl3LmRldi90b2tlbl9zdGF0dXNfbGlzdC9GQy9ldS5ldXJvcGEuZWMuZXVkaS5waWQuMS85MGI1YmNkNS02Mjg5LTRhMTItYjQ4Mi03NjMzZjJhMGYwMTEifX0sICJfc2RfYWxnIjogInNoYS0yNTYiLCAiY25mIjogeyJqd2siOiB7Imt0eSI6ICJFQyIsICJjcnYiOiAiUC0yNTYiLCAieCI6ICJSLTAydVl0Tnl3RDl0NWNBcDdXaGFybkt2d202eThZbFFEUVcxQzl3ajVFIiwgInkiOiAiVU14UFZGa25WbGxBVmdNRS14WVVmd1QyUmlhUDlxWkpub2R3Q1phZndJMCJ9fX0.WL19-gehYajMH5sCSeJZFOsU7tRd91-CFxoI_Uxhb0LAS31Y5bAbsS6IGAlEljhtMkC2brRu_D3pA1rMDk0bFA",
      },
      disclosures: [
        {
          salt: "EekOsa-FhF-_4W3O8FSCaQ",
          key: "family_name",
          value: "Mario",
          _digest: "cGILCy1DsR8zc7e_f-r2FLeouHo2fUhfK6PnQKBsH74",
          _encoded:
            "WyJFZWtPc2EtRmhGLV80VzNPOEZTQ2FRIiwgImZhbWlseV9uYW1lIiwgIk1hcmlvIl0",
        },
        {
          salt: "E-GYQ9kxpVNWwMhyqTynrA",
          key: "given_name",
          value: "Rossi",
          _digest: "on2D81aVlJ1R9TOA1ZQhpMRLvChM9PXm2W2niod9HHw",
          _encoded:
            "WyJFLUdZUTlreHBWTld3TWh5cVR5bnJBIiwgImdpdmVuX25hbWUiLCAiUm9zc2kiXQ",
        },
        {
          salt: "n1R737CZ7gK2764Cpj9AjQ",
          key: "birthdate",
          value: "2025-11-19",
          _digest: "_cc9-ZJA2ftNwHCil2X-xJc_GFfz-sYnDexUiJReQOU",
          _encoded:
            "WyJuMVI3MzdDWjdnSzI3NjRDcGo5QWpRIiwgImJpcnRoZGF0ZSIsICIyMDI1LTExLTE5Il0",
        },
        {
          salt: "zqRKBwfeoxthhrxRJCE05g",
          key: "country",
          value: "Italy",
          _digest: "X9X-xudwWvBR5HbWB7xI7otlMDODysTlvCSjjhif3Gg",
          _encoded:
            "WyJ6cVJLQndmZW94dGhocnhSSkNFMDVnIiwgImNvdW50cnkiLCAiSXRhbHkiXQ",
        },
        {
          salt: "-wc7MxiHqVoOoUuzn8B-eQ",
          key: "locality",
          value: "Roma",
          _digest: "23gRaTxzSpjEgaIsShKFhhiBMAcRzANJCyNzpxYUjak",
          _encoded:
            "WyItd2M3TXhpSHFWb09vVXV6bjhCLWVRIiwgImxvY2FsaXR5IiwgIlJvbWEiXQ",
        },
        {
          salt: "0AUv4nd--qfUdwxCEIs3Pw",
          key: "region",
          value: "Lazio",
          _digest: "gYt5Qucreq2D9GuS15jE0SOq75o4Zyuup9heJHyG0PM",
          _encoded:
            "WyIwQVV2NG5kLS1xZlVkd3hDRUlzM1B3IiwgInJlZ2lvbiIsICJMYXppbyJd",
        },
        {
          salt: "3cfOeGxBe0apzNXXvTP37Q",
          key: "place_of_birth",
          value: {
            _sd: [
              "23gRaTxzSpjEgaIsShKFhhiBMAcRzANJCyNzpxYUjak",
              "X9X-xudwWvBR5HbWB7xI7otlMDODysTlvCSjjhif3Gg",
              "gYt5Qucreq2D9GuS15jE0SOq75o4Zyuup9heJHyG0PM",
            ],
          },
          _digest: "6Kt7nkUnI2NDiIgrMfc9BXG85TlvSM0B7DxG-Fv790c",
          _encoded:
            "WyIzY2ZPZUd4QmUwYXB6TlhYdlRQMzdRIiwgInBsYWNlX29mX2JpcnRoIiwgeyJfc2QiOiBbIjIzZ1JhVHh6U3BqRWdhSXNTaEtGaGhpQk1BY1J6QU5KQ3lOenB4WVVqYWsiLCAiWDlYLXh1ZHdXdkJSNUhiV0I3eEk3b3RsTURPRHlzVGx2Q1NqamhpZjNHZyIsICJnWXQ1UXVjcmVxMkQ5R3VTMTVqRTBTT3E3NW80Wnl1dXA5aGVKSHlHMFBNIl19XQ",
        },
        {
          salt: "Xy_m1mCBrQ_-Q_bopFxq1A",
          value: "IT",
          _digest: "cGTyrqZuJ7-iI7SKl9mDk2IziuOL-y8zzV_mZ54Afhc",
          _encoded: "WyJYeV9tMW1DQnJRXy1RX2JvcEZ4cTFBIiwgIklUIl0",
        },
        {
          salt: "2SCarm-OjaULuehM2ErULw",
          key: "nationalities",
          value: [
            {
              "...": "cGTyrqZuJ7-iI7SKl9mDk2IziuOL-y8zzV_mZ54Afhc",
            },
          ],
          _digest: "y60gDOZD1sVcH-WrnrJA_k4toILiCUiZ8cl5vUC2V58",
          _encoded:
            "WyIyU0Nhcm0tT2phVUx1ZWhNMkVyVUx3IiwgIm5hdGlvbmFsaXRpZXMiLCBbeyIuLi4iOiAiY0dUeXJxWnVKNy1pSTdTS2w5bURrMkl6aXVPTC15OHp6Vl9tWjU0QWZoYyJ9XV0",
        },
        {
          salt: "2v6ukMuoCy9E_5gBmZGxRQ",
          key: "postal_code",
          value: "35010",
          _digest: "MPVmqPIXeniJRIox8jy7XxtqtH_HuaMUm_KMhHq2ncA",
          _encoded:
            "WyIydjZ1a011b0N5OUVfNWdCbVpHeFJRIiwgInBvc3RhbF9jb2RlIiwgIjM1MDEwIl0",
        },
        {
          salt: "7e90PurLbRJB70exM1spRw",
          key: "address",
          value: {
            _sd: ["MPVmqPIXeniJRIox8jy7XxtqtH_HuaMUm_KMhHq2ncA"],
          },
          _digest: "if5UXnHkf-pnOQF1mCgXcND4sh57liCXsQ3EqWOzJWQ",
          _encoded:
            "WyI3ZTkwUHVyTGJSSkI3MGV4TTFzcFJ3IiwgImFkZHJlc3MiLCB7Il9zZCI6IFsiTVBWbXFQSVhlbmlKUklveDhqeTdYeHRxdEhfSHVhTVVtX0tNaEhxMm5jQSJdfV0",
        },
        {
          salt: "1MzH1h3qQeQbntYYgTiCrQ",
          key: "date_of_issuance",
          value: "2025-11-19",
          _digest: "6Ql7515vqoL644UTcOYEwH-itH1VxsGphSbpvoAxhzw",
          _encoded:
            "WyIxTXpIMWgzcVFlUWJudFlZZ1RpQ3JRIiwgImRhdGVfb2ZfaXNzdWFuY2UiLCAiMjAyNS0xMS0xOSJd",
        },
        {
          salt: "Jj2aChcGeL1TFlcUJJe0Gg",
          key: "date_of_expiry",
          value: "2026-02-17",
          _digest: "qgFOH2ecWBUrwjjcrCMVA5oZ46GkzivikBMf-Rigu1k",
          _encoded:
            "WyJKajJhQ2hjR2VMMVRGbGNVSkplMEdnIiwgImRhdGVfb2ZfZXhwaXJ5IiwgIjIwMjYtMDItMTciXQ",
        },
        {
          salt: "LhLG-547iL-KOGwUuAvYaA",
          key: "issuing_authority",
          value: "Test PID issuer",
          _digest: "44A9K0xFo20y-Mz3r3habfAPGFfkUWVtBoU-JjBEXSk",
          _encoded:
            "WyJMaExHLTU0N2lMLUtPR3dVdUF2WWFBIiwgImlzc3VpbmdfYXV0aG9yaXR5IiwgIlRlc3QgUElEIGlzc3VlciJd",
        },
        {
          salt: "xp4eDEF75_HXTeVVu2AStw",
          key: "issuing_country",
          value: "FC",
          _digest: "zCR3V5iQkcfnqSh3KzvRtsSzPAjFNEgK5dk1NmRq-s8",
          _encoded:
            "WyJ4cDRlREVGNzVfSFhUZVZWdTJBU3R3IiwgImlzc3VpbmdfY291bnRyeSIsICJGQyJd",
        },
      ],
    } as SdJwtDecoded;

    const expectedParsed = {
      family_name: {
        value: "Mario",
        name: { en: "Family Name(s)" },
      },

      given_name: {
        value: "Rossi",
        name: { en: "Given Name(s)" },
      },

      birthdate: {
        value: "2025-11-19",
        name: { en: "Birth Date" },
      },

      place_of_birth: {
        value: {
          country: "Italy",
          region: "Lazio",
          locality: "Roma",
        },
        name: { en: "Birth Place" },
      },

      nationalities: {
        value: ["IT"],
        name: { en: "Nationalities" },
      },

      date_of_issuance: {
        value: "2025-11-19",
        name: { en: "Issuance Date" },
      },
      address: {
        name: {
          en: "Address",
        },
        value: {
          postal_code: {
            value: "35010",
            name: {
              en: "Postal Code",
            },
          },
        },
      },
      date_of_expiry: {
        value: "2026-02-17",
        name: { en: "Expiry Date" },
      },

      issuing_authority: {
        value: "Test PID issuer",
        name: { en: "Issuance Authority" },
      },

      issuing_country: {
        value: "FC",
        name: { en: "Issuing Country" },
      },
    };

    const issuerConf = {
      credential_configurations_supported: {
        "eu.europa.ec.eudi.pid_vc_sd_jwt": {
          credential_metadata: {
            claims: [
              {
                display: [
                  {
                    locale: "en",
                    name: "Family Name(s)",
                  },
                ],
                mandatory: true,
                path: ["family_name"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Given Name(s)",
                  },
                ],
                mandatory: true,
                path: ["given_name"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Birth Date",
                  },
                ],
                mandatory: true,
                path: ["birthdate"],
                value_type: "full-date",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Birth Place",
                  },
                ],
                mandatory: true,
                path: ["place_of_birth"],
                value_type: "list",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Nationalities",
                  },
                ],
                mandatory: true,
                path: ["nationalities"],
                value_type: "list",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Address",
                  },
                ],
                mandatory: false,
                path: ["address"],
                value_type: "test",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Street",
                  },
                ],
                mandatory: false,
                path: ["address", "street_address"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Locality",
                  },
                ],
                mandatory: false,
                path: ["address", "locality"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Region",
                  },
                ],
                mandatory: false,
                path: ["address", "region"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Postal Code",
                  },
                ],
                mandatory: false,
                path: ["address", "postal_code"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Country",
                  },
                ],
                mandatory: false,
                path: ["address", "country"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Full Address",
                  },
                ],
                mandatory: false,
                path: ["address", "formatted"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "House Number",
                  },
                ],
                mandatory: false,
                path: ["address", "house_number"],
                value_type: "uint",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Personal Administrative Number",
                  },
                ],
                mandatory: false,
                path: ["personal_administrative_number"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Portrait Image",
                  },
                ],
                mandatory: false,
                path: ["picture"],
                value_type: "jpeg",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Birth Family Name(s)",
                  },
                ],
                mandatory: false,
                path: ["birth_family_name"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Birth Given Name(s)",
                  },
                ],
                mandatory: false,
                path: ["birth_given_name"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Sex",
                  },
                ],
                mandatory: false,
                path: ["sex"],
                value_type: "uint",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Email Address",
                  },
                ],
                mandatory: false,
                path: ["email_address"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Mobile Phone Number",
                  },
                ],
                mandatory: false,
                path: ["mobile_phone_number"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Issuance Date",
                  },
                ],
                mandatory: true,
                path: ["date_of_issuance"],
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Expiry Date",
                  },
                ],
                mandatory: true,
                path: ["date_of_expiry"],
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Issuance Authority",
                  },
                ],
                mandatory: true,
                path: ["issuing_authority"],
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Document Number",
                  },
                ],
                mandatory: false,
                path: ["document_number"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Trust Anchor",
                  },
                ],
                mandatory: false,
                path: ["trust_anchor"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Issuing Country",
                  },
                ],
                mandatory: true,
                path: ["issuing_country"],
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Issuing Jurisdiction",
                  },
                ],
                mandatory: false,
                path: ["issuing_jurisdiction"],
              },
            ],
            display: [
              {
                locale: "en",
                logo: {
                  alt_text: "A square figure of a PID",
                  uri: "https://examplestate.com/public/pid.png",
                },
                name: "PID (SD-JWT VC)",
              },
            ],
          },
          credential_signing_alg_values_supported: ["ES256"],
          cryptographic_binding_methods_supported: ["jwk", "cose_key"],
          format: "dc+sd-jwt",
          proof_types_supported: {
            jwt: {
              proof_signing_alg_values_supported: ["ES256"],
            },
          },
          scope: "eu.europa.ec.eudi.pid_vc_sd_jwt",
          vct: "urn:eudi:pid:1",
        },
      },
    };

    const credentialConfig =
      issuerConf.credential_configurations_supported[
        "eu.europa.ec.eudi.pid_vc_sd_jwt"
      ];

    const parsed = parseCredentialSdJwt(credentialConfig, decoded, true);

    expect(parsed).toEqual(expectedParsed);
  });
});
