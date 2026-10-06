import type { IssuerConfig } from "../../api";

import {
  buildAuthorizationUrl,
  completePidUserAuthorizationWithQueryMode,
} from "../03-complete-user-authorization";
import { AuthorizationError, AuthorizationIdpError } from "../../common/errors";

describe("authorizeUserWithQueryMode", () => {
  it("should return the authorization result when the authorization server responds with a valid response", async () => {
    const authRes = {
      code: "abcdefg",
      iss: "123456",
      state: "123456",
    };
    const authRedirectUrl = `test://cb?code=abcdefg&state=123456&iss=123456`;

    const authResParsed =
      await completePidUserAuthorizationWithQueryMode(authRedirectUrl);

    expect(authResParsed).toMatchObject(authRes);
  });

  it("should throw an AuthorizationIdpError when an error is raised from the IDP", async () => {
    const authErr = new URLSearchParams({
      error: "abcdefg",
      error_description: "123456",
    });

    const authRedirectUrl = `test://cb?${authErr.toString()}`;

    await expect(
      completePidUserAuthorizationWithQueryMode(authRedirectUrl),
    ).rejects.toBeInstanceOf(AuthorizationIdpError);
  });

  it("should throw an AuthorizationError when the authorization response is not recognized", async () => {
    const wrongAuthRes = new URLSearchParams({
      random: "abcdefg",
    });

    const authRedirectUrl = `test://cb?${wrongAuthRes.toString()}`;

    await expect(
      completePidUserAuthorizationWithQueryMode(authRedirectUrl),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("buildAuthorizationUrl", () => {
  it("should build the authorization URL", async () => {
    const authUrl = await buildAuthorizationUrl(
      "issuerRequestUri",
      "clientId",
      {
        authorization_endpoint: "https://issuer.com/authorize",
      } as IssuerConfig,
      "idpHint",
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
        authorization_endpoint: "https://issuer.com/authorize",
      } as IssuerConfig,
    );

    expect(authUrl).toMatchObject({
      authUrl:
        "https://issuer.com/authorize?client_id=clientId&request_uri=issuerRequestUri",
    });
  });
});
