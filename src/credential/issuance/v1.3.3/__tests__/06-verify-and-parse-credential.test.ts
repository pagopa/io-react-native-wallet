import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import {
  credentialCnfJwk,
  issuerJwk,
  pid1_3,
} from "../../../../sd-jwt/__mocks__/sd-jwt";
import type { IssuerConfig } from "../../api";
import { verifyAndParseCredential } from "../06-verify-and-parse-credential";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  decode: jest.fn().mockReturnValue({}),
  thumbprint: jest.fn().mockImplementation(async (jwk) => jwk.kid),
  getJwkFromHeader: jest.fn().mockImplementation(
    (_, jwks) => jwks[0] // In the following tests there is always one JWK
  ),
}));

describe("verifyAndParseCredential", () => {
  const credentialCryptoContext: CryptoContext = {
    getPublicKey: async () => credentialCnfJwk,
    getSignature: async () => "",
  };

  const mockIssuerConf: IssuerConfig = {
    credential_issuer: "https://issuer.example",
    credential_endpoint: "https://issuer.example/credential",
    nonce_endpoint: "https://issuer.example/nonce",
    authorization_endpoint: "https://issuer.example/authorize",
    pushed_authorization_request_endpoint: "https://issuer.example/par",
    token_endpoint: "https://issuer.example/token",
    federation_entity: {},
    keys: [issuerJwk],
    credential_configurations_supported: {
      dc_sd_jwt_PersonIdentificationData: {
        format: "dc+sd-jwt",
        display: [],
        vct: "urn:it-wallet:pid:1",
        scope: "PersonIdentificationData",
        claims: [
          {
            path: ["given_name"],
            display: [
              { locale: "it-IT", name: "Nome" },
              { locale: "en-US", name: "First Name" },
            ],
          },
          {
            path: ["family_name"],
            display: [
              { locale: "it-IT", name: "Cognome" },
              { locale: "en-US", name: "Family Name" },
            ],
          },
          {
            path: ["birthdate"],
            display: [
              { locale: "it-IT", name: "Data di nascita" },
              { locale: "en-US", name: "Date of birth" },
            ],
          },
          {
            path: ["place_of_birth"],
            display: [
              { locale: "it-IT", name: "Luogo di nascita" },
              { locale: "en-US", name: "Place of birth" },
            ],
          },
          {
            path: ["place_of_birth", "locality"],
            display: [
              { locale: "it-IT", name: "Località di nascita" },
              { locale: "en-US", name: "Birth locality" },
            ],
          },
          {
            path: ["place_of_birth", "country"],
            display: [
              { locale: "it-IT", name: "Paese di nascita" },
              { locale: "en-US", name: "Birth country" },
            ],
          },
          {
            path: ["tax_id_code"],
            display: [
              { locale: "it-IT", name: "Codice Fiscale" },
              { locale: "en-US", name: "Tax id code" },
            ],
          },
          {
            path: ["nationalities"],
            display: [
              { locale: "it-IT", name: "Nazionalità" },
              { locale: "en-US", name: "Nationalities" },
            ],
          },
        ],
      },
    },
  };

  it("should verify and parse the PID", async () => {
    const result = await verifyAndParseCredential(
      mockIssuerConf,
      pid1_3,
      "dc_sd_jwt_PersonIdentificationData",
      { credentialCryptoContext }
    );
    expect(result).toEqual({
      parsedCredential: {
        given_name: {
          value: "Marco",
          name: { "it-IT": "Nome", "en-US": "First Name" },
        },
        family_name: {
          value: "Polo",
          name: { "it-IT": "Cognome", "en-US": "Family Name" },
        },
        birthdate: {
          value: "1989-11-23",
          name: { "it-IT": "Data di nascita", "en-US": "Date of birth" },
        },
        tax_id_code: {
          value: "TINIT-PLOMRC01P30L736Y",
          name: { "it-IT": "Codice Fiscale", "en-US": "Tax id code" },
        },
        nationalities: {
          value: ["IT", "PE"],
          name: { "it-IT": "Nazionalità", "en-US": "Nationalities" },
        },
        place_of_birth: {
          value: {
            locality: {
              value: "ROMA",
              name: {
                "it-IT": "Località di nascita",
                "en-US": "Birth locality",
              },
            },
          },
          name: { "it-IT": "Luogo di nascita", "en-US": "Place of birth" },
        },
      },
      expiration: new Date(4105033200000),
      issuedAt: new Date(1777026094000),
    });
  });
});
