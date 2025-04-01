import { AuthorizationError, AuthorizationIdpError } from "../errors";
import {
  buildAuthorizationUrl,
  completeUserAuthorizationWithQueryMode,
} from "../04-complete-user-authorization";
import type { Out } from "src/utils/misc";
import type { EvaluateIssuerTrust } from "src/credential/status";

describe("authorizeUserWithQueryMode", () => {
  it("should return the authorization result when the authorization server responds with a valid response", async () => {
    const authRes = {
      code: "abcdefg",
      state: "123456",
      iss: "123456",
    };
    const authRedirectUrl = `test://cb?code=abcdefg&state=123456&iss=123456`;

    const authResParsed = await completeUserAuthorizationWithQueryMode(
      authRedirectUrl
    );

    expect(authResParsed).toMatchObject(authRes);
  });

  it("should throw an AuthorizationIdpError when an error is raised from the IDP", async () => {
    const authErr = new URLSearchParams({
      error: "abcdefg",
      error_description: "123456",
    });

    const authRedirectUrl = `test://cb?${authErr.toString()}`;

    try {
      await completeUserAuthorizationWithQueryMode(authRedirectUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorizationIdpError);
    }
  });

  it("should throw an AuthorizationError when the authorization response is not recognized", async () => {
    const wrongAuthRes = new URLSearchParams({
      random: "abcdefg",
    });

    const authRedirectUrl = `test://cb?${wrongAuthRes.toString()}`;

    try {
      await completeUserAuthorizationWithQueryMode(authRedirectUrl);
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorizationError);
    }
  });
});

describe("buildAuthorizationUrl", () => {
  it("should build the authorization URL", async () => {
    const authUrl = await buildAuthorizationUrl(
      "issuerRequestUri",
      "clientId",
      {
        oauth_authorization_server: {
          authorization_endpoint: "https://issuer.com/authorize",
        },
      } as Out<EvaluateIssuerTrust>["issuerConf"],
      "idpHint"
    );

    expect(authUrl).toMatchObject({
      authUrl:
        "https://issuer.com/authorize?client_id=clientId&request_uri=issuerRequestUri&idphint=idpHint",
    });
  });

  it("should build the authorization URL without idpHint", async () => {
    const authUrl = await buildAuthorizationUrl(
      "issuerRequestUri",
      "clientId",
      {
        oauth_authorization_server: {
          authorization_endpoint: "https://issuer.com/authorize",
        },
      } as Out<EvaluateIssuerTrust>["issuerConf"]
    );

    expect(authUrl).toMatchObject({
      authUrl:
        "https://issuer.com/authorize?client_id=clientId&request_uri=issuerRequestUri",
    });
  });
});
