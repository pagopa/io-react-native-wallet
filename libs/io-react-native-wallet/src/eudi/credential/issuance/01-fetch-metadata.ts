import { decode } from "@pagopa/io-react-native-jwt";
import { ParsedLoTE } from "@pagopa/io-wallet-eudi-trust";

import { ValidationFailed } from "../../../utils/errors";
import { verifyJwtWithWRPAC, verifyWRPRC } from "../../trust/utils";
import {
  AuthorizationServerMetadata,
  CredentialIssuerMetadata,
} from "./types";
import { getJson, getJwt, getWellKnownUrl, parseOrThrow } from "./utils";

/**
 * Fetches the Credential Issuer Metadata and the metadata of the Authorization Server
 * to use for the issuance (OpenID4VCI 1.0, Section 12.2 and RFC 8414).
 *
 * The Authorization Server is the one indicated in the Credential Offer grant, if any,
 * otherwise the first one listed by the Credential Issuer, otherwise the Credential Issuer itself.
 *
 * @param credentialIssuer - The Credential Issuer identifier, from the Credential Offer
 * @param options.authorizationServer - (optional) The Authorization Server indicated in the Credential Offer grant
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
  }: {
    authorizationServer?: string;
    fetch?: typeof fetch;
  } = {},
) => {
  const issuerMetadataJwt = await getJwt(
    getWellKnownUrl(credentialIssuer, "openid-credential-issuer"),
    fetchFn,
  );

  const issuerMetadata = parseOrThrow(
    CredentialIssuerMetadata,
    decode(issuerMetadataJwt).payload,
    "Credential Issuer metadata",
  );

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

  return {
    authorizationServerMetadata,
    issuerMetadata,
    issuerMetadataJwt, // Return the raw JWT for subsequent validation
  };
};

/**
 * Verify whether the Issuer is authenticated: validate the WRPAC against the WRPAC Providers LoTE
 * and verify the metadata signature with the validated WRPAC.
 *
 * @param params.jwt The JWT to validate
 * @param options.wrpacLote - The WRPAC provider LotE to authenticate the Issuer
 */
export const verifyIssuerAuthentication = async ({
  jwt,
  wrpacLote,
}: {
  allowUnauthenticatedIssuer?: boolean;
  jwt: string;
  wrpacLote: ParsedLoTE;
}) => {
  try {
    await verifyJwtWithWRPAC({ jwt, wrpacLote });
    return { isWRPACValid: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
            }
          : {
              message: "Unexpected error during Issuer authentication",
              name: "IssuerAuthenticationFailure",
            },
      isWRPACValid: false,
    };
  }
};

const REGISTRATION_CERTIFICATE_FORMAT = "registration_cert";

/**
 * Verify whether the Issuer is authorized: validate the Registration Certificate (WRPRC)
 * found in the `issuer_info` of the metadata against the WRPRC Providers LoTE.
 *
 * @param params.issuerMetadata The decoded Credential Issuer metadata
 * @param params.wrprcLote The WRPRC provider LoTE to validate the Issuer Registration Certificate
 */
export const verifyIssuerAuthorization = async ({
  issuerMetadata,
  wrprcLote,
}: {
  issuerMetadata: CredentialIssuerMetadata,
  wrprcLote: ParsedLoTE;
}) => {
  try {
    const registrationCertificate = issuerMetadata.issuer_info?.find(
      ({ format }) => format === REGISTRATION_CERTIFICATE_FORMAT,
    );

    if (!registrationCertificate) {
      throw new ValidationFailed({
        claim: "issuer_info",
        message:
          "The Credential Issuer metadata has no registration certificate",
      });
    }

    await verifyWRPRC({ wrprcJwt: registrationCertificate.data, wrprcLote });

    // TODO: verify the WRPRC entitlements and their consistency with the issuance
    return { isWRPRCValid: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
            }
          : {
              message: "Unexpected error during Issuer authorization",
              name: "IssuerAuthorizationFailure",
            },
      isWRPRCValid: false,
    };
  }
};
