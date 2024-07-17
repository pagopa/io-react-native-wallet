import { hasStatus, type Out } from "../../utils/misc";
import type { EvaluateIssuerTrust, ObtainCredential } from "../issuance";
import {
  sha256ToBase64,
  SignJWT,
  type CryptoContext,
} from "@pagopa/io-react-native-jwt";
import uuid from "react-native-uuid";

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
  const credentialHash = sha256ToBase64(
    credential.slice(0, credential.indexOf("~"))
  );
  const statusAttUrl =
    issuerConf.openid_credential_issuer.status_attestation_endpoint;
  const credentialPop = await new SignJWT(credentialCryptoContext)
    .setPayload({
      aud: statusAttUrl,
      jti: uuid.v4().toString(),
      credential_hash: credentialHash,
      credential_hash_alg: "sha-256",
    })
    .setProtectedHeader({
      alg: "ES256",
      typ: "status-attestation-request+jwt",
      kid: jwk.kid,
    })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign();

  const body = new URLSearchParams({
    credential_pop: credentialPop,
  }).toString();

  return await appFetch(statusAttUrl, {
    method: "POST",
    body,
  })
    .then(hasStatus(200))
    .then((res) => res.json());
};
