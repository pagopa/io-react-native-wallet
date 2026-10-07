import type * as z from "zod";

import { type CryptoContext, decode } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";

import { IssuerResponseError, ValidationFailed } from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import { createPopToken } from "../../../utils/pop";

/**
 * How the wallet authenticates to the OAuth 2.0 endpoints (PAR and Token).
 * - `public`: public client identified only by its `client_id`
 * - `attestation`: OAuth 2.0 Attestation-Based Client Authentication with a Wallet Attestation,
 *   as required by HAIP (Section 4.4.1). The `client_id` is the `sub` of the attestation.
 */
export type ClientAuthentication =
  | {
      /** The key bound to the Wallet Attestation (`cnf`) */
      cryptoContext: CryptoContext;
      type: "attestation";
      walletAttestation: string;
    }
  | { clientId: string; type: "public" };

export const getClientId = (clientAuthentication: ClientAuthentication) => {
  if (clientAuthentication.type === "public") {
    return clientAuthentication.clientId;
  }
  const { sub } = decode(clientAuthentication.walletAttestation).payload;
  if (!sub) {
    throw new ValidationFailed({
      claim: "sub",
      message: "The Wallet Attestation has no sub to use as client_id",
    });
  }
  return sub;
};

/**
 * Returns the headers that authenticate the wallet to an OAuth 2.0 endpoint.
 * @param audience - The issuer identifier of the Authorization Server
 */
export const getClientAuthenticationHeaders = async (
  clientAuthentication: ClientAuthentication,
  audience: string,
): Promise<Record<string, string>> => {
  if (clientAuthentication.type === "public") {
    return {};
  }
  const pop = await createPopToken(
    {
      aud: audience,
      iss: getClientId(clientAuthentication),
      jti: uuidv4(),
    },
    clientAuthentication.cryptoContext,
  );
  return {
    "OAuth-Client-Attestation": clientAuthentication.walletAttestation,
    "OAuth-Client-Attestation-PoP": pop,
  };
};

/**
 * Builds a well-known URL by inserting the well-known segment between the host
 * and the path of the identifier (RFC 8414, Section 3.1 and OpenID4VCI 1.0, Section 12.2.2).
 */
export const getWellKnownUrl = (identifier: string, suffix: string) => {
  const { origin, pathname } = new URL(identifier);
  const path = pathname.replace(/\/$/, "");
  return `${origin}/.well-known/${suffix}${path}`;
};

export const getJson = (url: string, fetchFn: typeof fetch) =>
  fetchFn(url, { headers: { Accept: "application/json" }, method: "GET" })
    .then(hasStatusOrThrow(200, IssuerResponseError))
    .then((res) => res.json() as Promise<unknown>);

export const parseOrThrow = <T extends z.ZodType>(
  schema: T,
  value: unknown,
  name: string,
): z.infer<T> => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationFailed({
      message: `Invalid ${name}`,
      reason: result.error.message,
    });
  }
  return result.data;
};

/**
 * Sends a DPoP-protected request, retrying once with the server-provided nonce
 * when the server requires one (RFC 9449, Sections 8 and 9).
 * @param createDPoP - Creates the DPoP proof, with the nonce when provided
 * @param initialNonce - (optional) A nonce already provided by the server, e.g. by the Nonce Endpoint
 */
export const fetchWithDPoP = async (
  url: string,
  init: RequestInit,
  createDPoP: (nonce?: string) => Promise<string>,
  fetchFn: typeof fetch,
  initialNonce?: string,
) => {
  const send = async (nonce?: string) =>
    fetchFn(url, {
      ...init,
      headers: { ...init.headers, DPoP: await createDPoP(nonce) },
    });

  const res = await send(initialNonce);
  const nonce = res.headers.get("DPoP-Nonce");
  return nonce && (await isNonceRequired(res.clone())) ? send(nonce) : res;
};

const isNonceRequired = async (res: Response) => {
  // Resource servers signal it in the WWW-Authenticate header
  if (res.status === 401) {
    return !!res.headers.get("WWW-Authenticate")?.includes("use_dpop_nonce");
  }
  // Authorization servers signal it in the error response body
  if (res.status === 400) {
    const body = await res.json().catch(() => undefined);
    return body?.error === "use_dpop_nonce";
  }
  return false;
};
