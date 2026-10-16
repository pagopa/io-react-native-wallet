import { decode } from "@pagopa/io-react-native-jwt"
import { ParsedLoTE } from "@pagopa/io-wallet-eudi-trust";

import { ValidationFailed } from "../../../utils/errors";
import { verifyJwtWithWRPAC } from "../../trust/utils";
import { AuthorizationServerMetadata, CredentialIssuerMetadata } from "./types";
import { getJson, getJwt, getWellKnownUrl, parseOrThrow } from "./utils";
import { JWTDecodeResult } from "../../../utils/jwk";

/**
 * Fetches the Credential Issuer Metadata and the metadata of the Authorization Server
 * to use for the issuance (OpenID4VCI 1.0, Section 12.2 and RFC 8414).
 *
 * The Authorization Server is the one indicated in the Credential Offer grant, if any,
 * otherwise the first one listed by the Credential Issuer, otherwise the Credential Issuer itself.
 *
 * @param credentialIssuer - The Credential Issuer identifier, from the Credential Offer
 * @param options.authorizationServer - (optional) The Authorization Server indicated in the Credential Offer grant
 * @param options.wrpacLote - The WRPAC provider LotE to authenticate the Issuer
 * @param options.fetch - (optional) The fetch implementation, defaults to the global one
 * @returns The Credential Issuer and Authorization Server metadata
 * @throws {IssuerResponseError} If the metadata cannot be fetched
 * @throws {ValidationFailed} If the metadata is not valid or inconsistent
 */
export const fetchMetadata = async (
  credentialIssuer: string,
  {
    authorizationServer,
    fetch: fetchFn = fetch,
    wrpacLote,
  }: {
    authorizationServer?: string;
    fetch?: typeof fetch;
    wrpacLote?: ParsedLoTE
  } = {},
) => {
  const issuerMetadataJwt = await getJwt(
    getWellKnownUrl(credentialIssuer, "openid-credential-issuer"),
    fetchFn,
  )

  const decodedIssuerMetadataJwt = decode(issuerMetadataJwt)

  // EUDI Trust Issuer authentication
  if (wrpacLote) {
    await verifyJwtWithWRPAC({
      wrpacLote,
      jwt: {
        compact: issuerMetadataJwt,
        decoded: decodedIssuerMetadataJwt
      },
    })
  }

  const issuerMetadata = parseOrThrow(
    CredentialIssuerMetadata,
    decodedIssuerMetadataJwt.payload,
    "Credential Issuer metadata",
  );

  // TODO: verify the WRPRC as well (here or later...)

  if (issuerMetadata.credential_issuer !== credentialIssuer) {
    throw new ValidationFailed({
      claim: "credential_issuer",
      message: "The Credential Issuer metadata refer to a different issuer",
    });
  }

  const { authorization_servers } = issuerMetadata;
  if (
    authorizationServer &&
    authorization_servers &&
    !authorization_servers.includes(authorizationServer)
  ) {
    throw new ValidationFailed({
      claim: "authorization_server",
      message:
        "The Authorization Server of the Credential Offer is not listed by the Credential Issuer",
    });
  }

  const issuer =
    authorizationServer ?? authorization_servers?.[0] ?? credentialIssuer;

  // Fall back to the OpenID Connect discovery when the OAuth 2.0 one is not available
  const rawAuthorizationServerMetadata = await getJson(
    getWellKnownUrl(issuer, "oauth-authorization-server"),
    fetchFn,
  ).catch(() =>
    getJson(
      `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
      fetchFn,
    ),
  );

  const authorizationServerMetadata = parseOrThrow(
    AuthorizationServerMetadata,
    rawAuthorizationServerMetadata,
    "Authorization Server metadata",
  );

  if (authorizationServerMetadata.issuer !== issuer) {
    throw new ValidationFailed({
      claim: "issuer",
      message:
        "The Authorization Server metadata refer to a different Authorization Server",
    });
  }

  return { authorizationServerMetadata, issuerMetadata };
};
