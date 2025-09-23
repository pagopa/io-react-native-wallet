import * as z from "zod";

/**
 * Context for authorization during the {@link 03-start-user-authorization.ts} phase.
 * It consists of a single method to identify the user which takes a URL and a redirect schema as input.
 * Once the authorization is completed and the URL calls the redirect schema, the method should return the redirect URL.
 */
export interface AuthorizationContext {
  authorize: (url: string, redirectSchema: string) => Promise<string>;
}

/**
 * The result of the identification process.
 */
export const AuthorizationResultShape = z.object({
  code: z.string(),
  state: z.string().optional(),
});

/**
 * The error of the identification process.
 * It follows the OAuth/OIDC error response format.
 * @see https://openid.net/specs/openid-connect-core-1_0.html#AuthError
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
 */
export const AuthorizationErrorShape = z.object({
  error: z.string(), // not enforcing the error code format
  error_description: z.string().optional(),
  error_uri: z.string().optional(),
  state: z.string().optional(),
});

/**
 * Type of the identification result.
 */
export type AuthorizationResult = z.infer<typeof AuthorizationResultShape>;
