import type { AuthorizationContext } from "src/utils/auth";
import {
  AuthorizationError,
  AuthorizationIdpError,
} from "../../../utils/errors";
import { completeUserAuthorizationWithQueryMode } from "../04-complete-user-authorization";
import { CredentialIssuerEntityConfiguration } from "../../../trust/types";

describe("authorizeUserWithQueryMode", () => {
  // Mocks required for the authorization process
  const issuerRequestUri = "https://example.com/authz";
  const redirectUri = "test://cb";
  const idpHint = "idp";
  const clientId = "clientId";
  const issuerConf = {
    oauth_authorization_server: {
      authorization_endpoint: "https://example.com/auth",
    }, // This is the only field required for the test
  } as CredentialIssuerEntityConfiguration["payload"]["metadata"];

  it("should return the authorization result when the authorization server responds with a valid response", async () => {
    const authRes = {
      code: "abcdefg",
      state: "123456",
      iss: "123456",
    };

    const authContext: AuthorizationContext = {
      authorize: jest
        .fn()
        .mockResolvedValue(
          `test://example.com?${new URLSearchParams(authRes).toString()}`
        ),
    };

    const result = await completeUserAuthorizationWithQueryMode(
      issuerRequestUri,
      clientId,
      issuerConf,
      authContext,
      idpHint,
      redirectUri
    );

    expect(result).toMatchObject(authRes);
  });

  it("should throw an AuthorizationIdpError when an error is raised from the IDP", async () => {
    const authErr = new URLSearchParams({
      error: "abcdefg",
      error_description: "123456",
    });

    const authContext: AuthorizationContext = {
      authorize: jest
        .fn()
        .mockResolvedValue(`test://example.com?${authErr.toString()}`),
    };

    await expect(() =>
      completeUserAuthorizationWithQueryMode(
        issuerRequestUri,
        clientId,
        issuerConf,
        authContext,
        idpHint,
        redirectUri
      )
    ).rejects.toThrowError(AuthorizationIdpError);
  });

  it("should throw an AuthorizationError when the authorization response is not recognized", async () => {
    const wrongAuthRes = new URLSearchParams({
      random: "abcdefg",
    });

    const authContext: AuthorizationContext = {
      authorize: jest
        .fn()
        .mockResolvedValue(`test://example.com?${wrongAuthRes.toString()}`),
    };

    await expect(() =>
      completeUserAuthorizationWithQueryMode(
        issuerRequestUri,
        clientId,
        issuerConf,
        authContext,
        idpHint,
        redirectUri
      )
    ).rejects.toThrowError(AuthorizationError);
  });
});
