import {
  getCredentialHashWithouDiscloures,
  hasStatus,
  type Out,
} from "../../utils/misc";
import type { EvaluateIssuerTrust, ObtainCredential } from "../issuance";
import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
import uuid from "react-native-uuid";
import { StatusAttestationResponse } from "./types";
import { IoWalletError, WalletProviderResponseError } from "../../utils/errors";
import { StatusAttestationError, StatusAttestationInvalid } from "./errors";

export type StatusAttestation = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credential: Out<ObtainCredential>["credential"],
  credentialCryptoContext: CryptoContext,
  appFetch?: GlobalFetch["fetch"]
) => Promise<string>;

/**
 * WARNING: This function must be called after {@link startFlow}. The next function to be called is {@link startUserAuthorization}.
 * The Issuer trust evaluation phase.
 * Fetch the Issuer's configuration and verify trust.
 *
 * @param issuerUrl The base url of the Issuer returned by {@link startFlow}
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The Issuer's configuration
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

  return await appFetch(statusAttUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then(hasStatus(201))
    .then((raw) => raw.json())
    .then(StatusAttestationResponse.parse)
    .catch(handleStatusAttestationError);
};

const handleStatusAttestationError = (e: unknown) => {
  if (!(e instanceof IoWalletError)) {
    throw e;
  }

  if (e.code === 404) {
    throw new StatusAttestationInvalid(
      "Invalid status found for the given credential",
      e.claim,
      e.reason
    );
  }

  throw new StatusAttestationError(
    `Unable to obtain the status attestation for the given credential [response status code: ${e.statusCode}]`,
    e.claim,
    e.reason
  );
};
