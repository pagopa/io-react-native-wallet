import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import {
  WalletProviderEntityConfiguration,
  TrustAnchorEntityConfiguration,
  CredentialIssuerEntityConfiguration,
  RelyingPartyEntityConfiguration,
} from "./types";
import { IoWalletError } from "../utils/errors";
import { verifyTrustChain } from "./chain";

export { verifyTrustChain };

/**
 * Fetch and parse teh entity configuration document for a given federation entity
 *
 * @param entityBaseUrl The base url of the entity.
 * @param schema The expected schema of the entity configuration, according to the kind of entity we are fetching from.
 * @param options.appFetch An optional instance of the http client to be used.
 * @returns The parsed entity configuration object
 * @throws {IoWalletError} If the http request fails
 * @throws Parse error if the document is not in the expected shape.
 */
export async function getEntityConfiguration(
  entityBaseUrl: string,
  schema: typeof WalletProviderEntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<WalletProviderEntityConfiguration>;
export async function getEntityConfiguration(
  entityBaseUrl: string,
  schema: typeof RelyingPartyEntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<RelyingPartyEntityConfiguration>;
export async function getEntityConfiguration(
  entityBaseUrl: string,
  schema: typeof TrustAnchorEntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<TrustAnchorEntityConfiguration>;
export async function getEntityConfiguration(
  entityBaseUrl: string,
  schema: typeof CredentialIssuerEntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<CredentialIssuerEntityConfiguration>;
export async function getEntityConfiguration(
  entityBaseUrl: string,
  schema: /* FIXME: why is it different from "typeof EntityConfiguration"? */
  | typeof CredentialIssuerEntityConfiguration
    | typeof WalletProviderEntityConfiguration
    | typeof RelyingPartyEntityConfiguration
    | typeof TrustAnchorEntityConfiguration,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
) {
  const wellKnownUrl = `${entityBaseUrl}/.well-known/openid-federation`;

  const response = await appFetch(wellKnownUrl, {
    method: "GET",
  });

  if (response.status === 200) {
    const responseText = await response.text();
    const responseJwt = decodeJwt(responseText);
    return schema.parse({
      header: responseJwt.protectedHeader,
      payload: responseJwt.payload,
    });
  }

  throw new IoWalletError(
    `Unable to obtain Entity Configuration at ${wellKnownUrl}. Response code: ${response.status}`
  );
}
