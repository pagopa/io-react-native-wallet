import * as z from "zod";
import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import { assert, hasStatusOrThrow } from "../../utils/misc";
import { IoWalletError } from "../../utils/errors";
import type { JWK } from "../../utils/jwk";

type FetchRegistryParams<T> = {
  schema: z.ZodType<T>;
  appFetch?: GlobalFetch["fetch"];
} & ({ asJson: true } | { asJson?: false; jwks: JWK[] });

/**
 * Utility to fetch an entity from the Registry Infrastructure.
 * The function supports both `application/json` and `application/jwt` responses.
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
  params: FetchRegistryParams<T>
): Promise<T> => {
  const { schema, appFetch = fetch, asJson = false } = params;

  const response = await appFetch(url, {
    method: "GET",
    headers: {
      Accept: asJson ? "application/json" : "application/jwt",
    },
  }).then(hasStatusOrThrow(200));

  const contentType = response.headers.get("Content-Type");

  if (contentType?.includes("application/json")) {
    const responseJson = await response.json();
    return schema.parse(responseJson);
  }

  if (contentType?.includes("application/jwt")) {
    assert("jwks" in params, "params.jwks required when response is JWT");

    const responseText = await response.text();
    const responseJwt = decodeJwt(responseText);
    const headerKid = responseJwt.protectedHeader.kid;
    const signatureJwk = params.jwks.find((jwk) => jwk.kid === headerKid);
    if (!signatureJwk) {
      throw new IoWalletError(
        `Could not find JWK with kid ${headerKid} in Trust Anchor's Entity Configuration`
      );
    }
    await verify(responseText, signatureJwk);
    return schema.parse({
      header: responseJwt.protectedHeader,
      payload: responseJwt.payload,
    });
  }

  throw new IoWalletError(`Unsupported content-type: ${contentType}`);
};
