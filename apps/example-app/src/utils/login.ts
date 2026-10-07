import URLParse from "url-parse";

import type { EnvType } from "../store/types";

import { getEnv } from "./environment";

/**
 * Entity ID of the CIE identity provider in the PROD environment,
 * used to start the CIE login flow on the IO backend.
 */
export const CIE_PROD_ENTITY_ID = "xx_servizicie";

type AuthLevel = "SpidL2" | "SpidL3";

/**
 * Builds the IO backend login URI for the given identity provider.
 * @param env - The selected environment
 * @param entityID - The identity provider entity ID (SPID IDP id or {@link CIE_PROD_ENTITY_ID})
 * @param authLevel - The requested authentication level
 * @returns the login URI
 */
export const getIoLoginUri = (
  env: EnvType,
  entityID: string,
  authLevel: AuthLevel,
) => {
  const { WALLET_PROVIDER_BASE_URL } = getEnv(env);
  const url = new URL("/api/auth/v1/login", WALLET_PROVIDER_BASE_URL);
  url.searchParams.append("entityID", entityID);
  url.searchParams.append("authLevel", authLevel);
  return url.href;
};

/**
 * Extracts the IO session token from the final login redirect URL.
 * The token can be either in the query string or in the hash fragment of the `profile.html` page.
 * @param url - The URL to inspect
 * @returns the session token, or `undefined` if the URL is not the login success page
 */
export const extractIoLoginToken = (url: string): string | undefined => {
  if (!url.includes("profile.html")) return undefined;

  const { hash } = new URLParse(url);
  let { searchParams } = new URL(url);
  if (hash) {
    const paramsString = hash.startsWith("#") ? hash.slice(1) : hash;
    searchParams = new URLSearchParams(paramsString);
  }
  return searchParams.get("token") ?? undefined;
};
