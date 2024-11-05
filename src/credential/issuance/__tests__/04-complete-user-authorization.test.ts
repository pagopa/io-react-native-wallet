import {
  AuthorizationError,
  AuthorizationIdpError,
} from "../../../utils/errors";
import { completeUserAuthorizationWithQueryMode } from "../04-complete-user-authorization";

describe("authorizeUserWithQueryMode", () => {
  const redirectUri = "test://cb";
  it("should return the authorization result when the authorization server responds with a valid response", async () => {
    const authRes = {
      code: "abcdefg",
      state: "123456",
      iss: "123456",
    };

    const authRedirectUrl = `test://cb?code=abcdefg&state=123456&iss=123456`;

    const result = await completeUserAuthorizationWithQueryMode(
      authRedirectUrl,
      redirectUri
    );

    expect(result).toMatchObject(authRes);
  });

  it("should throw an AuthorizationIdpError when an error is raised from the IDP", async () => {
    const authErr = new URLSearchParams({
      error: "abcdefg",
      error_description: "123456",
    });

    const authRedirectUrl = `test://cb?${authErr.toString()}`;

    await expect(() =>
      completeUserAuthorizationWithQueryMode(authRedirectUrl, redirectUri)
    ).rejects.toThrowError(AuthorizationIdpError);
  });

  it("should throw an AuthorizationError when the authorization response is not recognized", async () => {
    const wrongAuthRes = new URLSearchParams({
      random: "abcdefg",
    });

    const authRedirectUrl = `test://cb?${wrongAuthRes.toString()}`;

    await expect(() =>
      completeUserAuthorizationWithQueryMode(authRedirectUrl, redirectUri)
    ).rejects.toThrowError(AuthorizationError);
  });
});
