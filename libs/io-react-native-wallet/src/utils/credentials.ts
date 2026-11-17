/**
 * Legacy credentials do not end with `~`. This function adds `~` when needed
 * to avoid decoding errors in the @sd-jwt libraries.
 */
export const fixLegacyCredentialSdJwt = (token: string) => {
  if (!token.endsWith("~")) {
    const hasKeyBindingJwt = token.split("~").at(-1)?.split(".").length === 3;
    // Either we have a key binding JWT or it is a legacy 0.7.1 credential
    return hasKeyBindingJwt ? token : `${token}~`;
  }
  return token;
};
