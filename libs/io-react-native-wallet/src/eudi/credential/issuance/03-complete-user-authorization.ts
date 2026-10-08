import type { AuthorizationServerMetadata } from "./types";

import {
  AuthorizationError,
  AuthorizationIdpError,
} from "../../../credential/issuance/common/errors";

/**
 * Completes the user authorization by parsing the Authorization Response
 * received on the redirect URI (RFC 6749, Section 4.1.2).
 *
 * @param redirectUrl - The URL the browser was redirected to
 * @param options.authorizationServerMetadata - The Authorization Server metadata, to check the `iss` parameter when supported (RFC 9207)
 * @param options.state - The `state` sent with the authorization request
 * @returns The authorization code
 * @throws {AuthorizationIdpError} If the Authorization Server returned an error
 * @throws {AuthorizationError} If the response is not valid
 */
export const completeUserAuthorization = (
  redirectUrl: string,
  {
    authorizationServerMetadata,
    state,
  }: {
    authorizationServerMetadata: AuthorizationServerMetadata;
    state: string;
  },
) => {
  const { searchParams } = new URL(redirectUrl);

  const error = searchParams.get("error");
  if (error) {
    throw new AuthorizationIdpError(
      error,
      searchParams.get("error_description") ?? undefined,
    );
  }

  if (searchParams.get("state") !== state) {
    throw new AuthorizationError(
      "The authorization response state does not match",
    );
  }

  // The issuer is checked whenever present, and required when the Authorization Server
  // declares to send it (RFC 9207, Section 2.4)
  const iss = searchParams.get("iss");
  const { authorization_response_iss_parameter_supported, issuer } =
    authorizationServerMetadata;
  if (
    (iss !== null || authorization_response_iss_parameter_supported) &&
    iss !== issuer
  ) {
    throw new AuthorizationError(
      `The authorization response comes from a different Authorization Server: expected ${issuer}, got ${iss}`,
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    throw new AuthorizationError("The authorization response has no code");
  }

  return { code };
};
