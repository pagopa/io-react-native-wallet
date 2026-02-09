import { hasStatusOrThrow } from "../../../utils/misc";
import { type IssuerMetadata } from "../api";
import { IoWalletError } from "../../../utils/errors";
import type { z } from "zod";

/**
 * Fetch and validate the Credential Issuer metadata
 * from `/.well-known/openid-credential-issuer` endpoint.
 *
 * @param issuerBaseUrl The base URL of the credential issuer.
 * @param schema The Zod schema to validate the metadata against.
 * @param appFetch Optional fetch API implementation.
 * @returns The parsed metadata as a validated object.
 */
export async function getCredentialIssuerMetadata<T extends IssuerMetadata>(
  issuerBaseUrl: string,
  schema: z.ZodType<T>,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<IssuerMetadata> {
  const url = new URL(issuerBaseUrl);
  const wellKnownPath = "/.well-known/openid-credential-issuer";
  const originalPath = url.pathname === "/" ? "" : url.pathname;
  const wellKnownUrl = `${url.origin}${wellKnownPath}${originalPath}`;
  return await appFetch(wellKnownUrl, { method: "GET" })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((json) => {
      const result = schema.safeParse(json);
      if (!result.success) {
        throw new IoWalletError(
          `Invalid credential issuer metadata received from ${wellKnownUrl}. Error: ${result.error.message}`
        );
      }

      return result.data;
    });
}
