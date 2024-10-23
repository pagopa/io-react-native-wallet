import {
  getCredentialHashWithouDiscloures,
  hasStatus,
  safeJsonParse,
  type Out,
} from "../../utils/misc";
import type { EvaluateIssuerTrust, ObtainCredential } from "../issuance";
import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
import uuid from "react-native-uuid";
import {
  InvalidStatusAttestationResponse,
  StatusAttestationResponse,
} from "./types";
import {
  StatusAttestationError,
  StatusAttestationInvalid,
  UnexpectedStatusCodeError,
} from "../../utils/errors";

export type StatusAttestation = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credential: Out<ObtainCredential>["credential"],
  credentialCryptoContext: CryptoContext,
  appFetch?: GlobalFetch["fetch"]
) => Promise<{
  statusAttestation: StatusAttestationResponse["status_attestation"];
}>;

/**
 * WARNING: This function must be called after {@link startFlow}.
 * Verify the status of the credential attestation.
 * @param issuerConf - The issuer's configuration
 * @param credential - The credential to be verified
 * @param credentialCryptoContext - The credential's crypto context
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @throws {@link StatusAttestationInvalid} if the status attestation is invalid and thus the credential is not valid
 * @throws {@link StatusAttestationError} if an error occurs during the status attestation
 * @returns The credential status attestation
 */
export const statusAttestation: StatusAttestation = async (
  issuerConf,
  credential,
  credentialCryptoContext,
  appFetch: GlobalFetch["fetch"] = fetch
) => {
  const jwk = await credentialCryptoContext.getPublicKey();
  const credentialHash = await getCredentialHashWithouDiscloures(credential);
  const statusAttUrl =
    issuerConf.openid_credential_issuer.status_attestation_endpoint;
  const credentialPop = await new SignJWT(credentialCryptoContext)
    .setPayload({
      aud: statusAttUrl,
      jti: uuid.v4().toString(),
      credential_hash: credentialHash,
      credential_hash_alg: "S256",
    })
    .setProtectedHeader({
      alg: "ES256",
      typ: "status-attestation-request+jwt",
      kid: jwk.kid,
    })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign();

  const body = {
    credential_pop: credentialPop,
  };

  const result = await appFetch(statusAttUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then(hasStatus(201))
    .then((raw) => raw.json())
    .then((json) => StatusAttestationResponse.parse(json))
    .catch(handleStatusAttestationError);

  return { statusAttestation: result.status_attestation };
};

/**
 * Handle the status attestation error by mapping it to a custom exception.
 * If the error is not an instance of {@link UnexpectedStatusCodeError}, it is thrown as is.
 * @param e - The error to be handled
 * @throws {@link StatusAttestationError} if the status code is different from 404
 * @throws {@link StatusAttestationInvalid} if the status code is 404 (meaning the credential is invalid)
 */
const handleStatusAttestationError = (e: unknown) => {
  if (!(e instanceof UnexpectedStatusCodeError)) {
    throw e;
  }

  if (e.statusCode === 404) {
    const maybeError = InvalidStatusAttestationResponse.safeParse(
      safeJsonParse(e.responseBody)
    );
    throw new StatusAttestationInvalid(
      "Invalid status found for the given credential",
      maybeError.success ? maybeError.data.error : "unknown",
      e.message
    );
  }

  throw new StatusAttestationError(
    `Unable to obtain the status attestation for the given credential [response status code: ${e.statusCode}]`,
    e.message
  );
};
