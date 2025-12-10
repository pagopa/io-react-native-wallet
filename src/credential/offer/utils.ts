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
/**
 * Fetches the Authorization Server metadata from the given AS URL.
 * @param authenticSourceBaseUrl - The URL of the Authorization Server.
 * @param appFetch - Optional fetch API implementation.
 * @returns The parsed AS metadata as a validated object.
 * @throws If the fetched metadata is invalid.
 */
/**
 * Fetches the Authorization Server metadata, attempting first
 * the OAuth 2.0 discovery endpoint (RFC8414), then the OIDC endpoint.
 * Falls back if the first attempt results in a 404 or network error.
 * * @param authenticSourceBaseUrl - The URL of the Authorization Server.
 * @param appFetch - Optional fetch API implementation.
 * @returns The parsed AS metadata as a validated object.
 * @throws If both endpoints fail or if metadata is invalid.
 */
import { IoWalletError } from "../../utils/errors";
import { Logger, LogLevel } from "../../utils/logging";

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
  const url = new URL(issuerBaseUrl);
  const wellKnownPath = "/.well-known/openid-credential-issuer";
  const originalPath = url.pathname === "/" ? "" : url.pathname;
  const wellKnownUrl = `${url.origin}${wellKnownPath}${originalPath}`;
  return await appFetch(wellKnownUrl, { method: "GET" })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((json) => {
      const result = CredentialIssuerMetadataSchema.safeParse(json);
      console.log("OpendID Credential Issuer Metadata fetched:", result);
      if (!result.success) {
        throw new IoWalletError(
          `Invalid credential issuer metadata received from ${wellKnownUrl}. Error: ${result.error.message}`
        );
      }

      return result.data;
    });
}

/**
 * Fetches the Authorization Server metadata, utilizzando la logica specifica
 * di concatenazione del percorso dell'utente e provando in sequenza
 * .well-known/oauth-authorization-server e .well-known/openid-configuration.
 * @param authenticSourceBaseUrl - L'URL base del Server di Autorizzazione (AS).
 * @param appFetch - Optional fetch API implementation.
 * @returns The parsed AS metadata as a validated object.
 * @throws If both endpoints fail or if metadata is invalid.
 */
export const getAuthenticSourceMetadata = async (
  authenticSourceBaseUrl: string,
  appFetch: GlobalFetch["fetch"]
): Promise<ASMetadata> => {
  const url = new URL(authenticSourceBaseUrl);

  const originalPath = url.pathname === "/" ? "" : url.pathname;
  const discoveryPaths = [
    "/.well-known/oauth-authorization-server",
    "/.well-known/openid-configuration",
  ];

  for (const wellKnownPath of discoveryPaths) {
    const fullUrl = `${url.origin}${wellKnownPath}${originalPath}`;

    try {
      Logger.log(LogLevel.INFO, `AS Metadata: ${fullUrl}`);

      const response = await appFetch(fullUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (response.status === 404) {
        Logger.log(
          LogLevel.WARN,
          `${fullUrl} got 404 Not Found, trying next discovery endpoint if available.`
        );
        continue;
      }

      const jsonResponse = await response.json();
      const metadata = ASMetadataSchema.safeParse(jsonResponse);

      if (!metadata.success) {
        throw new IoWalletError(
          `Invalid AS metadata from ${wellKnownPath}: ${metadata.error.message}`
        );
      }

      Logger.log(LogLevel.INFO, `AS Metadata from ${wellKnownPath}`);
      return metadata.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Logger.log(LogLevel.ERROR, `Error ${wellKnownPath}: ${errorMessage}`);

      if (wellKnownPath === discoveryPaths[discoveryPaths.length - 1]) {
        throw new IoWalletError(`Unexpected error ${errorMessage}`);
      }
    }
  }

  throw new IoWalletError(
    "Unable to fetch AS metadata from any known endpoints"
  );
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
