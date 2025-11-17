import {
  generateRandomAlphaNumericString,
  hasStatusOrThrow,
} from "../../utils/misc";
import { sha256ToBase64 } from "@pagopa/io-react-native-jwt";
import {
  type CredentialIssuerMetadata,
  CredentialIssuerMetadataSchema,
} from "./types";
import { IoWalletError } from "../../utils/errors";

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
