import type { AuthorizationContext } from "src/utils/auth";
import { authorizeUserWithQueryMode } from "../03-start-credential-issuance";
import {
  AuthorizationError,
  AuthorizationIdpError,
} from "../../../utils/errors";

describe("authorizeUserWithQueryMode", () => {
  // Mocks required for the authorization process
  const authzRequestEndpoint = "https://example.com/authz";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: "123456789",
    redirect_uri: "https://example.com/callback",
  });
  const redirectSchema = "test";

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

    const result = await authorizeUserWithQueryMode(
      authzRequestEndpoint,
      params,
      redirectSchema,
      authContext
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
      authorizeUserWithQueryMode(
        authzRequestEndpoint,
        params,
        redirectSchema,
        authContext
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
      authorizeUserWithQueryMode(
        authzRequestEndpoint,
        params,
        redirectSchema,
        authContext
      )
    ).rejects.toThrowError(AuthorizationError);
  });
});
