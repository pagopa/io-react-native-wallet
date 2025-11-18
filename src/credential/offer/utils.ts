import {
  generateRandomAlphaNumericString,
  hasStatusOrThrow,
} from "../../utils/misc";
import { sha256ToBase64 } from "@pagopa/io-react-native-jwt";
import {
  type ASMetadata,
  ASMetadataSchema,
  type CredentialIssuerMetadata,
  CredentialIssuerMetadataSchema,
} from "./types";
import { IoWalletError, IssuerResponseError } from "../../utils/errors";

/**
 * Fetch and validate the Credential Issuer metadata
 * from `/.well-known/openid-credential-issuer` endpoint.
 *
 * @param issuerBaseUrl The base URL of the credential issuer.
 * @param appFetch Optional fetch API implementation.
 * @returns The parsed metadata as a validated object.
 */
export async function getCredentialIssuerMetadata(
  issuerBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<CredentialIssuerMetadata> {
  const wellKnownUrl = `${issuerBaseUrl}/.well-known/openid-credential-issuer`;
  return await appFetch(wellKnownUrl, { method: "GET" })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((json) => {
      console.log(json);
      const result = CredentialIssuerMetadataSchema.safeParse(json);

      if (!result.success) {
        throw new IoWalletError(
          `Invalid credential issuer metadata received from ${wellKnownUrl}. Error: ${result.error.message}`
        );
      }

      return result.data;
    });
}

/**
 * Fetches the Authorization Server metadata from the given AS URL.
 * @param authenticSourceBaseUrl - The URL of the Authorization Server.
 * @param appFetch - Optional fetch API implementation.
 * @returns The parsed AS metadata as a validated object.
 * @throws If the fetched metadata is invalid.
 */
export const getAuthenticSourceMetadata = async (
  authenticSourceBaseUrl: string,
  appFetch: GlobalFetch["fetch"]
): Promise<ASMetadata> => {
  const url = new URL(authenticSourceBaseUrl);
  url.pathname = url.pathname.endsWith("/")
    ? url.pathname + ".well-known/openid-configuration"
    : url.pathname + "/.well-known/openid-configuration";

  const response = await appFetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then(hasStatusOrThrow(200, IssuerResponseError))
    .then((res) => res.json());

  const metadata = ASMetadataSchema.safeParse(response);
  if (!metadata.success) {
    throw new Error(`Invalid AS metadata: ${metadata.error.message}`);
  }
  return metadata.data;
};

/**
 * Generates a PKCE code verifier and its corresponding code challenge.
 * @returns An object containing the code verifier and code challenge.
 */
export const generatePkce = async (): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> => {
  const codeVerifier = generateRandomAlphaNumericString(48);
  const codeChallenge = await sha256ToBase64(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
  };
};
