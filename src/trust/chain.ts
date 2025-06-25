import {
  EntityConfiguration,
  EntityStatement,
  TrustAnchorEntityConfiguration,
} from "./types";
import { JWK } from "../utils/jwk";
import * as z from "zod";
import { getSignedEntityConfiguration, getSignedEntityStatement } from ".";
import {
  decode,
  getTrustAnchorX509Certificate,
  type ParsedToken,
  verify,
} from "./utils";
import {
  FederationError,
  MissingFederationFetchEndpointError,
  MissingX509CertsError,
  TrustChainEmptyError,
  TrustChainRenewalError,
  TrustChainTokenMissingError,
  X509ValidationError,
} from "./errors";
import {
  type CertificateValidationResult,
  verifyCertificateChain,
  type X509CertificateOptions,
} from "@pagopa/io-react-native-crypto";

// The first element of the chain is supposed to be the Entity Configuration for the document issuer
const FirstElementShape = EntityConfiguration;
// Each element but the first is supposed to be an Entity Statement
const MiddleElementShape = EntityStatement;
// The last element of the chain can either be an Entity Statement
//  or the Entity Configuration for the known Trust Anchor
const LastElementShape = z.union([
  EntityStatement,
  TrustAnchorEntityConfiguration,
]);

/**
 * Validates a provided trust chain against a known trust anchor, including X.509 certificate checks.
 *
 * @param trustAnchorEntity The entity configuration of the known trust anchor (for JWT validation).
 * @param chain The chain of statements to be validated.
 * @param x509Options Options for X.509 certificate validation.
 * @returns The list of parsed tokens representing the chain.
 * @throws {FederationError} If the chain is not valid (JWT or X.509). Specific errors like TrustChainEmptyError, X509ValidationError may be thrown.
 */
export async function validateTrustChain(
  trustAnchorEntity: TrustAnchorEntityConfiguration,
  chain: string[],
  x509Options: X509CertificateOptions
): Promise<ParsedToken[]> {
  // If the chain is empty, fail
  if (chain.length === 0) {
    throw new TrustChainEmptyError("Cannot verify empty trust chain.");
  }

  // Select the expected token shape
  const selectTokenShape = (elementIndex: number) =>
    elementIndex === 0
      ? FirstElementShape
      : elementIndex === chain.length - 1
        ? LastElementShape
        : MiddleElementShape;

  // Select the kid from the current index
  const selectKid = (currentIndex: number): string => {
    const token = chain[currentIndex];
    if (!token) {
      throw new TrustChainTokenMissingError(
        `Token missing at index ${currentIndex} in trust chain.`,
        { index: currentIndex }
      );
    }
    const shape = selectTokenShape(currentIndex);
    return shape.parse(decode(token)).header.kid;
  };

  // Select keys from the next token
  // If the current token is the last, keys from trust anchor will be used
  const selectKeys = (currentIndex: number): JWK[] => {
    if (currentIndex === chain.length - 1) {
      return trustAnchorEntity.payload.jwks.keys;
    }

    const nextIndex = currentIndex + 1;
    const nextToken = chain[nextIndex];
    if (!nextToken) {
      throw new TrustChainTokenMissingError(
        `Next token missing at index ${nextIndex} (needed for keys for token at ${currentIndex}).`,
        { index: nextIndex }
      );
    }
    const shape = selectTokenShape(nextIndex);
    return shape.parse(decode(nextToken)).payload.jwks.keys;
  };

  const x509TrustAnchorCertBase64 =
    getTrustAnchorX509Certificate(trustAnchorEntity);

  // Iterate the chain and validate each element's signature against the public keys of its next
  // If there is no next, hence it's the end of the chain, and it must be verified by the Trust Anchor
  const validationPromises = chain.map(async (tokenString, i) => {
    const kidFromTokenHeader = selectKid(i);
    const signerJwks = selectKeys(i);

    // Step 1: Verify JWT signature
    const parsedToken = await verify(
      tokenString,
      kidFromTokenHeader,
      signerJwks
    );

    // Step 2: X.509 Certificate Chain Validation
    const jwkUsedForVerification = signerJwks.find(
      (k) => k.kid === kidFromTokenHeader
    );

    if (!jwkUsedForVerification) {
      throw new FederationError(
        `JWK with kid '${kidFromTokenHeader}' was not found in signer's JWKS for token at index ${i}, though JWT verification passed.`,
        { tokenIndex: i, kid: kidFromTokenHeader }
      );
    }

    if (
      !jwkUsedForVerification.x5c ||
      jwkUsedForVerification.x5c.length === 0
    ) {
      throw new MissingX509CertsError(
        `JWK with kid '${kidFromTokenHeader}' does not contain an X.509 certificate chain (x5c) for token at index ${i}.`
      );
    }

    const originalX5cChain: string[] = jwkUsedForVerification.x5c;
    let certChainToPassToNative = [...originalX5cChain];

    // If the chain has more than one certificate AND
    // the last certificate in the x5c chain is the same as the trust anchor,
    // remove the anchor from the chain being passed, as it's supplied separately.
    if (
      certChainToPassToNative.length > 1 &&
      certChainToPassToNative.at(-1) === x509TrustAnchorCertBase64
    ) {
      certChainToPassToNative.pop(); // Remove the last element
    }

    const x509ValidationResult: CertificateValidationResult =
      await verifyCertificateChain(
        certChainToPassToNative,
        x509TrustAnchorCertBase64,
        x509Options
      );

    if (!x509ValidationResult.isValid) {
      throw new X509ValidationError(
        `X.509 certificate chain validation failed for token at index ${i} (kid: ${kidFromTokenHeader}). Status: ${x509ValidationResult.validationStatus}. Error: ${x509ValidationResult.errorMessage}`,
        {
          tokenIndex: i,
          kid: kidFromTokenHeader,
          x509ValidationStatus: x509ValidationResult.validationStatus,
          x509ErrorMessage: x509ValidationResult.errorMessage,
        }
      );
    }
    return parsedToken;
  });

  return Promise.all(validationPromises);
}

/**
 * Given a trust chain, obtain a new trust chain by fetching each element's fresh version
 *
 * @param chain The original chain
 * @param appFetch (optional) fetch api implementation
 * @returns A list of signed token that represent the trust chain, in the same order of the provided chain
 * @throws {FederationError} If the chain is not valid
 */
export async function renewTrustChain(
  chain: string[],
  appFetch: GlobalFetch["fetch"] = fetch
): Promise<string[]> {
  return Promise.all(
    chain.map(async (token, index) => {
      const decoded = decode(token);

      const entityStatementResult = EntityStatement.safeParse(decoded);
      const entityConfigurationResult = EntityConfiguration.safeParse(decoded);

      if (entityConfigurationResult.success) {
        return getSignedEntityConfiguration(
          entityConfigurationResult.data.payload.iss,
          { appFetch }
        );
      }
      if (entityStatementResult.success) {
        const entityStatement = entityStatementResult.data;

        const parentBaseUrl = entityStatement.payload.iss;
        const parentECJwt = await getSignedEntityConfiguration(parentBaseUrl, {
          appFetch,
        });
        const parentEC = EntityConfiguration.parse(decode(parentECJwt));

        const federationFetchEndpoint =
          parentEC.payload.metadata.federation_entity.federation_fetch_endpoint;
        if (!federationFetchEndpoint) {
          throw new MissingFederationFetchEndpointError(
            `Parent EC at ${parentBaseUrl} is missing federation_fetch_endpoint, cannot renew ES for ${entityStatement.payload.sub}.`,
            {
              entityBaseUrl: entityStatement.payload.sub,
              missingInEntityUrl: parentBaseUrl,
            }
          );
        }
        return getSignedEntityStatement(
          federationFetchEndpoint,
          entityStatement.payload.sub,
          { appFetch }
        );
      }
      throw new TrustChainRenewalError(
        `Failed to renew trust chain. Reason: element #${index} failed to parse.`,
        { originalChain: chain }
      );
    })
  );
}
