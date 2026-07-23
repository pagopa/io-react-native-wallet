import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import * as z from "zod";

import type { JWK } from "../../utils/jwk";

import { IoWalletError } from "../../utils/errors";
import { assert, hasStatusOrThrow } from "../../utils/misc";

type FetchRegistryParams<T> = {
  appFetch?: GlobalFetch["fetch"];
  schema: z.ZodType<T>;
} & ({ asJson: true } | { asJson?: false; jwks: JWK[] });

/**
 * Utility to fetch an entity from the Registry Infrastructure.
 * The function supports `application/json` and signed JOSE/JWT responses.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html
 *
 * @param url The url to fetch from
 * @param params.schema The Zod schema to validate the response
 * @param params.jwks JWKS to validate JWT signature
 * @param params.appFetch Custom fetch implementation
 * @param params.asJson Request a response in simple JSON format (no JWT)
 * @returns The parsed entity
 */
export const fetchRegistry = async <T>(
  url: string,
  params: FetchRegistryParams<T>,
): Promise<T> => {
  const { appFetch = fetch, asJson = false, schema } = params;

  const response = await appFetch(url, {
    headers: {
      Accept: asJson ? "application/json" : "application/jose, application/jwt",
    },
    method: "GET",
  }).then(hasStatusOrThrow(200));

  const contentType = response.headers.get("Content-Type");

  if (contentType?.includes("application/json")) {
    const responseJson = await response.json();
    return schema.parse(responseJson);
  }

  if (
    contentType?.includes("application/jwt") ||
    contentType?.includes("application/jose")
  ) {
    assert("jwks" in params, "params.jwks required when response is JWT");

    const responseText = await response.text();
    const responseJwt = decodeJwt(responseText);
    const headerKid = responseJwt.protectedHeader.kid;
    const signatureJwk = params.jwks.find((jwk) => jwk.kid === headerKid);
    if (!signatureJwk) {
      throw new IoWalletError(
        `Could not find JWK with kid ${headerKid} in Trust Anchor's Entity Configuration`,
      );
    }
    await verify(responseText, signatureJwk);
    return schema.parse({
      header: responseJwt.protectedHeader,
      payload: responseJwt.payload,
    });
  }

  throw new IoWalletError(
    `Unsupported content-type for ${url}: ${contentType}`,
  );
};

/**
 * Fetch a locale bundle file from the Registry Infrastructure.
 * Bundle files are flat JSON objects mapping l10n_id keys to translated strings.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html
 *
 * @param baseUri The base URI from a registry's localization object
 * @param locale The locale code (e.g. "it", "en")
 * @param appFetch Custom fetch implementation
 * @returns Flat key→value translation map
 */
export const fetchLocaleBundle = async (
  baseUri: string,
  locale: string,
  appFetch: GlobalFetch["fetch"] = fetch,
): Promise<Record<string, string>> => {
  const url = `${baseUri.replace(/\/$/, "")}/${locale}.json`;

  const response = await appFetch(url, {
    headers: { Accept: "application/json" },
    method: "GET",
  }).then(hasStatusOrThrow(200));

  const contentType = response.headers.get("Content-Type");
  if (!contentType?.includes("application/json")) {
    throw new IoWalletError(
      `Locale bundle at ${url} returned unexpected Content-Type: ${contentType}`,
    );
  }

  const responseJson = await response.json();
  return z.record(z.string(), z.string()).parse(responseJson);
};
