import {
  type CryptoContext,
  sha256ToBase64,
  SignJWT,
} from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";

import { createDPopToken } from "../../../utils/dpop";
import { IoWalletError, IssuerResponseError } from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import {
  type CredentialIssuerMetadata,
  CredentialResponse,
  NonceResponse,
  type TokenResponse,
} from "./types";
import {
  type ClientAuthentication,
  fetchWithDPoP,
  getClientId,
  parseOrThrow,
} from "./utils";

export interface ObtainCredentialParams {
  accessToken: TokenResponse;
  clientAuthentication: ClientAuthentication;
  credentialConfigurationId: string;
  /** The key the credential is bound to */
  credentialCryptoContext: CryptoContext;
  /** The key the access token is bound to */
  dPopCryptoContext: CryptoContext;
  fetch?: typeof fetch;
  issuerMetadata: CredentialIssuerMetadata;
  /** (optional) Key Attestation of the credential key, sent in the proof as required by HAIP (Section 4.5.1) */
  keyAttestation?: string;
}

/**
 * Requests the credential to the Credential Endpoint (OpenID4VCI 1.0, Section 8),
 * with a JWT proof of possession of the credential key (Appendix F.1), carrying its
 * Key Attestation when provided (Appendix D).
 *
 * The credential is requested by `credential_identifier` when the Token Response
 * returned one for the credential, otherwise by `credential_configuration_id`.
 *
 * @returns The issued credentials and their format
 * @throws {IssuerResponseError} If the Nonce or Credential Request fails
 * @throws {ValidationFailed} If a response is not valid
 * @throws {IoWalletError} If the issuance is deferred, which is not supported yet
 */
export const obtainCredential = async ({
  accessToken,
  clientAuthentication,
  credentialConfigurationId,
  credentialCryptoContext,
  dPopCryptoContext,
  fetch: fetchFn = fetch,
  issuerMetadata,
  keyAttestation,
}: ObtainCredentialParams) => {
  const { credential_endpoint, credential_issuer, nonce_endpoint } =
    issuerMetadata;

  // The Nonce Endpoint may also provide the DPoP nonce for the Credential Request (HAIP, Section 4)
  const { cNonce, dPopNonce } = nonce_endpoint
    ? await fetchFn(nonce_endpoint, { method: "POST" })
        .then(hasStatusOrThrow(200, IssuerResponseError))
        .then(async (res) => ({
          cNonce: parseOrThrow(
            NonceResponse,
            await res.json(),
            "Nonce Response",
          ).c_nonce,
          dPopNonce: res.headers.get("DPoP-Nonce") ?? undefined,
        }))
    : { cNonce: undefined, dPopNonce: undefined };

  const proof = await new SignJWT(credentialCryptoContext)
    .setProtectedHeader({
      jwk: await credentialCryptoContext.getPublicKey(),
      typ: "openid4vci-proof+jwt",
      ...(keyAttestation && { key_attestation: keyAttestation }),
    })
    .setPayload({
      aud: credential_issuer,
      iss: getClientId(clientAuthentication),
      ...(cNonce && { nonce: cNonce }),
    })
    .setIssuedAt()
    .sign();

  const credentialIdentifier = accessToken.authorization_details?.find(
    (detail) =>
      detail.credential_configuration_id === credentialConfigurationId,
  )?.credential_identifiers[0];

  const isDPoPBound = accessToken.token_type.toLowerCase() === "dpop";
  const ath = await sha256ToBase64(accessToken.access_token);

  const credentialResponse = await fetchWithDPoP(
    credential_endpoint,
    {
      body: JSON.stringify({
        ...(credentialIdentifier
          ? { credential_identifier: credentialIdentifier }
          : { credential_configuration_id: credentialConfigurationId }),
        proofs: { jwt: [proof] },
      }),
      headers: {
        Authorization: `${isDPoPBound ? "DPoP" : "Bearer"} ${accessToken.access_token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    (nonce) =>
      createDPopToken(
        {
          ath,
          htm: "POST",
          htu: credential_endpoint,
          jti: uuidv4(),
          nonce,
        },
        dPopCryptoContext,
      ),
    fetchFn,
    dPopNonce,
  )
    .then((res) =>
      res.status === 202
        ? res
        : hasStatusOrThrow(200, IssuerResponseError)(res),
    )
    .then((res) => res.json());

  const { credentials } = parseOrThrow(
    CredentialResponse,
    credentialResponse,
    "Credential Response",
  );

  if (!credentials) {
    throw new IoWalletError(
      "Deferred credential issuance is not supported yet",
    );
  }

  return {
    credentials: credentials.map(({ credential }) => credential),
    format:
      issuerMetadata.credential_configurations_supported[
        credentialConfigurationId
      ]?.format,
  };
};
