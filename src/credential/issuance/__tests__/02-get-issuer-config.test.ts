import { getIssuerConfig } from "../02-get-issuer-config";
import {
  expectedResult,
  mockedKeys,
  mockedOauthServerConfig,
  mockedOpenIdConfiguration,
  mockedOpenIdCredentialIssuer,
} from "../../../../__mocks__/@pagopa/io-react-native-wallet/credential/02-get-issuer-config";

const mockAppFetch = jest.fn(async (url: string) => {
  if (url.endsWith("openid-credential-issuer")) {
    return {
      json: async () => mockedOpenIdCredentialIssuer,
      status: 200,
    } as Response;
  }
  if (url.endsWith("oauth-authorization-server")) {
    return {
      json: async () => mockedOauthServerConfig,
      status: 200,
    } as Response;
  }
  if (url.endsWith("openid-configuration")) {
    return {
      json: async () => mockedOpenIdConfiguration,
      status: 200,
    } as Response;
  }
  if (url.endsWith("json")) {
    return {
      json: async () => mockedKeys,
      status: 200,
    } as Response;
  }
  throw new Error();
});

describe("Test issuer config is retrieved correctly", () => {
  it("should return a matching issuer configuration", async () => {
    const issuerConf = await getIssuerConfig("https://irrelevant.url.org", {
      appFetch: mockAppFetch,
    });

    expect(issuerConf).toEqual(expectedResult);
  });
});
