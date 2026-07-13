import type { CryptoContext } from "@pagopa/io-react-native-jwt";

import type { IssuerConfig } from "../../api";

import { verifyAndParseCredential } from "../06-verify-and-parse-credential";
import {
  credentialCnfJwk,
  issuerJwk,
  pid1_3,
} from "../../../../sd-jwt/__mocks__/sd-jwt";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  decode: jest.fn().mockReturnValue({}),
  getJwkFromHeader: jest.fn().mockImplementation(
    (_, jwks) => jwks[0], // In the following tests there is always one JWK
  ),
  thumbprint: jest.fn().mockImplementation(async (jwk) => jwk.kid),
  verify: jest.fn().mockReturnValue(true),
}));

describe("verifyAndParseCredential", () => {
  const credentialCryptoContext: CryptoContext = {
    getPublicKey: async () => credentialCnfJwk,
    getSignature: async () => "",
  };

  const mockIssuerConf: IssuerConfig = {
    authorization_endpoint: "https://issuer.example/authorize",
    credential_configurations_supported: {
      dc_sd_jwt_pid: {
        claims: [
          {
            path: ["iss"],
          },
          {
            path: ["iat"],
          },
          {
            display: [
              { locale: "it-IT", name: "Nome" },
              { locale: "en-US", name: "First Name" },
            ],
            path: ["given_name"],
          },
          {
            display: [
              { locale: "it-IT", name: "Cognome" },
              { locale: "en-US", name: "Family Name" },
            ],
            path: ["family_name"],
          },
          {
            display: [
              { locale: "it-IT", name: "Data di nascita" },
              { locale: "en-US", name: "Date of birth" },
            ],
            path: ["birthdate"],
          },
          {
            display: [
              { locale: "it-IT", name: "Luogo di nascita" },
              { locale: "en-US", name: "Place of birth" },
            ],
            path: ["place_of_birth"],
          },
          {
            display: [
              { locale: "it-IT", name: "Località di nascita" },
              { locale: "en-US", name: "Birth locality" },
            ],
            path: ["place_of_birth", "locality"],
          },
          {
            display: [
              { locale: "it-IT", name: "Paese di nascita" },
              { locale: "en-US", name: "Birth country" },
            ],
            path: ["place_of_birth", "country"],
          },
          {
            display: [
              { locale: "it-IT", name: "Codice Fiscale" },
              { locale: "en-US", name: "Tax id code" },
            ],
            path: ["tax_id_code"],
          },
          {
            display: [
              { locale: "it-IT", name: "Nazionalità" },
              { locale: "en-US", name: "Nationalities" },
            ],
            path: ["nationalities"],
          },
        ],
        display: [],
        format: "dc+sd-jwt",
        scope: "PersonIdentificationData",
        vct: "urn:it-wallet:pid:1",
      },
    },
    credential_endpoint: "https://issuer.example/credential",
    credential_issuer: "https://issuer.example",
    federation_entity: {},
    keys: [issuerJwk],
    nonce_endpoint: "https://issuer.example/nonce",
    pushed_authorization_request_endpoint: "https://issuer.example/par",
    token_endpoint: "https://issuer.example/token",
  };

  it("should verify and parse the PID", async () => {
    const result = await verifyAndParseCredential(
      mockIssuerConf,
      pid1_3,
      "dc_sd_jwt_pid",
      { credentialCryptoContext, validateCertificateChain: false },
    );
    expect(result).toEqual({
      expiration: new Date(4105033200000),
      issuedAt: new Date(1777026094000),
      parsedCredential: {
        birthdate: {
          name: { "en-US": "Date of birth", "it-IT": "Data di nascita" },
          value: "1989-11-23",
        },
        family_name: {
          name: { "en-US": "Family Name", "it-IT": "Cognome" },
          value: "Polo",
        },
        given_name: {
          name: { "en-US": "First Name", "it-IT": "Nome" },
          value: "Marco",
        },
        nationalities: {
          name: { "en-US": "Nationalities", "it-IT": "Nazionalità" },
          value: ["IT", "PE"],
        },
        place_of_birth: {
          name: { "en-US": "Place of birth", "it-IT": "Luogo di nascita" },
          value: {
            locality: {
              name: {
                "en-US": "Birth locality",
                "it-IT": "Località di nascita",
              },
              value: "ROMA",
            },
          },
        },
        tax_id_code: {
          name: { "en-US": "Tax id code", "it-IT": "Codice Fiscale" },
          value: "TINIT-PLOMRC01P30L736Y",
        },
      },
    });
  });

  it("should throw if no x5c claim is present in the SD-JWT header", async () => {
    await expect(() =>
      verifyAndParseCredential(
        mockIssuerConf,
        pid1_3,
        "dc_sd_jwt_pid",
        { credentialCryptoContext },
        "mockCertRoot",
      ),
    ).rejects.toThrow("Missing x509 certificates");
  });
});
