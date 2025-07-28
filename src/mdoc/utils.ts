/**
 * @param namespace The mdoc credential `namespace`
 * @param key The claim attribute key
 * @returns A string consisting of the concatenation of the namespace and the claim key, separated by a colon
 */
export const getParsedCredentialClaimKey = (namespace: string, key: string) =>
  `${namespace}:${key}`;
