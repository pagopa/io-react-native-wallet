import {
  getJwkFromHeader,
  type CryptoContext,
  decode,
} from "@pagopa/io-react-native-jwt";
import { type SDJwt, SDJwtInstance } from "@sd-jwt/core";
import { digest, ES256 } from "@sd-jwt/crypto-nodejs";
import { isPathEqual, isPrefixOf } from "../../../utils/parser";
import { IoWalletError } from "../../../utils/errors";
import { LogLevel, Logger } from "../../../utils/logging";
import { isSameThumbprint, type JWK } from "../../../utils/jwk";
import type { SdJwt4VC } from "../../../sd-jwt"; // TODO: remove or create a common SD-JWT type
import type { IssuanceApi, IssuerConfig, ParsedCredential } from "../api";

type CredentialConf =
  IssuerConfig["credential_configurations_supported"][string];

/**
 * Parse a Sd-Jwt credential according to the issuer configuration
 * @param credentialConfig - the list of supported credentials, as defined in the issuer configuration with their claims metadata
 * @param parsedCredentialRaw - the raw parsed credential
 * @param ignoreMissingAttributes - skip error when attributes declared in the issuer configuration are not found within disclosures
 * @param includeUndefinedAttributes - include attributes not explicitly declared in the issuer configuration
 * @returns The parsed credential with attributes in plain value
 */
const parseCredentialSdJwt = (
  credentialConfig: CredentialConf,
  parsedCredentialRaw: Record<string, unknown>,
  ignoreMissingAttributes: boolean = false,
  includeUndefinedAttributes: boolean = false
): ParsedCredential => {
  const claimsMetadata = credentialConfig.claims || [];

  // Check that all mandatory attributes defined in the issuer configuration are present in the credential
  if (!ignoreMissingAttributes) {
    const missingPaths: string[] = [];
    const rootKeysToVerify = new Set(
      claimsMetadata
        .map((c) => c.path[0])
        .filter((p): p is string => typeof p === "string")
    );

    for (const rootKey of rootKeysToVerify) {
      if (!(rootKey in parsedCredentialRaw)) {
        missingPaths.push(rootKey);
      }
    }

    if (missingPaths.length > 0) {
      const missing = missingPaths.join(", ");
      const received = Object.keys(parsedCredentialRaw).join(", ");
      throw new IoWalletError(
        `Some attributes are missing in the credential. Missing: [${missing}], received: [${received}]`
      );
    }
  }

  /**
   * Helper to find display metadata for any given path
   */
  const getDisplayNames = (
    path: (string | number | null)[]
  ): Record<string, string> | undefined => {
    const match = claimsMetadata.find((c) => isPathEqual(c.path, path));
    if (!match) return undefined;

    const nameMap: Record<string, string> = {};
    for (const entry of match.display) {
      nameMap[entry.locale] = entry.name;
    }
    return nameMap;
  };

  /**
   * Recursive function to build the localized structure
   */
  const processLevel = (
    currentData: unknown,
    currentPath: (string | number | null)[]
  ): unknown => {
    // Handle Arrays
    if (Array.isArray(currentData)) {
      return currentData.map((item) =>
        processLevel(item, [...currentPath, null])
      );
    }

    // Handle Objects
    if (typeof currentData !== "object" || currentData === null) {
      return currentData;
    }

    const dataObj = currentData as Record<string, unknown>;
    const result: ParsedCredential = {};
    const processedKeys = new Set<string | number>();

    // Identify unique keys in config at this level
    const configKeysAtThisLevel: (string | number)[] = [];
    for (const claim of claimsMetadata) {
      // Check if the claim path starts with the current path
      if (isPrefixOf(currentPath, claim.path)) {
        const nextPart = claim.path[currentPath.length];
        if (
          (typeof nextPart === "string" || typeof nextPart === "number") &&
          !configKeysAtThisLevel.includes(nextPart)
        ) {
          configKeysAtThisLevel.push(nextPart);
        }
      }
    }

    // Process keys
    for (const key of configKeysAtThisLevel) {
      const stringKey = key.toString();
      const dataValue = dataObj[stringKey];
      if (dataValue === undefined) continue;

      const newPath = [...currentPath, key];

      let localizedNames = getDisplayNames(newPath);

      // Fallback for arrays
      if (!localizedNames && Array.isArray(dataValue)) {
        localizedNames = getDisplayNames([...newPath, null]);
      }

      result[stringKey] = {
        name: localizedNames || stringKey,
        value: processLevel(dataValue, newPath),
      };

      processedKeys.add(key);
    }

    // Handle Undefined Attributes
    if (includeUndefinedAttributes) {
      for (const [key, value] of Object.entries(dataObj)) {
        if (!processedKeys.has(key)) {
          result[key] = {
            name: key,
            value: value,
          };
        }
      }
    }

    return result;
  };

  return processLevel(parsedCredentialRaw, []) as ParsedCredential;
};

/**
 * Given a credential, verify it's in the supported format
 * and the credential is correctly signed
 * and it's bound to the given key
 *
 * @param rawCredential The received credential
 * @param issuerKeys The set of public keys of the issuer,
 * which will be used to verify the signature
 * @param holderBindingContext The access to the holder's key
 *
 * @throws If the signature verification fails
 * @throws If the credential is not in the SdJwt4VC format
 * @throws If the holder binding is not properly configured
 *
 */
async function verifyCredentialSdJwt(
  rawCredential: string,
  issuerKeys: JWK[],
  holderBindingContext: CryptoContext
): Promise<SDJwt> {
  const { protectedHeader } = decode(rawCredential);
  const verifierJwk = getJwkFromHeader(protectedHeader, issuerKeys);

  const sdJwtInstance = new SDJwtInstance({
    hasher: digest,
    verifier: await ES256.getVerifier(verifierJwk),
  });

  const [verifiedCredential, holderBindingKey] = await Promise.all([
    sdJwtInstance.verify(rawCredential),
    holderBindingContext.getPublicKey(),
  ]);

  const { cnf } = verifiedCredential.payload as SdJwt4VC["payload"];
  if (!(await isSameThumbprint(cnf.jwk, holderBindingKey as JWK))) {
    const message = `Failed to verify holder binding, expected kid: ${holderBindingKey.kid}, got: ${cnf.jwk.kid}`;
    Logger.log(LogLevel.ERROR, message);
    throw new IoWalletError(message);
  }

  return await sdJwtInstance.decode(rawCredential);
}

export const verifyAndParseCredentialSdJwt: IssuanceApi["verifyAndParseCredential"] =
  async (
    issuerConf,
    credential,
    credentialConfigurationId,
    {
      credentialCryptoContext,
      ignoreMissingAttributes,
      includeUndefinedAttributes,
    }
  ) => {
    const decoded = await verifyCredentialSdJwt(
      credential,
      issuerConf.keys,
      credentialCryptoContext
    );

    Logger.log(
      LogLevel.DEBUG,
      `Decoded credential: ${JSON.stringify(decoded)}`
    );

    const credentialConfig =
      issuerConf.credential_configurations_supported[credentialConfigurationId];

    if (!credentialConfig) {
      Logger.log(
        LogLevel.ERROR,
        `Credential type not supported by the issuer: ${credentialConfigurationId}`
      );
      throw new IoWalletError("Credential type not supported by the issuer");
    }

    const parsedCredentialRaw = (await decoded.getClaims(digest)) as Record<
      string,
      unknown
    >;

    const parsedCredential = parseCredentialSdJwt(
      credentialConfig,
      parsedCredentialRaw,
      ignoreMissingAttributes,
      includeUndefinedAttributes
    );

    const issuedAt =
      typeof parsedCredentialRaw.iat === "number"
        ? new Date(parsedCredentialRaw.iat * 1000)
        : undefined;

    if (typeof parsedCredentialRaw.exp !== "number") {
      throw new IoWalletError("Invalid or missing expiration claim (exp)");
    }
    const expiration = new Date(parsedCredentialRaw.exp * 1000);

    Logger.log(
      LogLevel.DEBUG,
      `Parsed credential: ${JSON.stringify(parsedCredential)}\nIssued at: ${issuedAt}`
    );

    return {
      parsedCredential,
      expiration,
      issuedAt,
    };
  };
