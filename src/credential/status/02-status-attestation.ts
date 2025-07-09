import {
  getCredentialHashWithouDiscloures,
  hasStatusOrThrow,
  type Out,
} from "../../utils/misc";
import type { EvaluateIssuerTrust, ObtainCredential } from "../issuance";
import { type CryptoContext, SignJWT } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";
import { StatusAttestationResponse } from "./types";
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
} from "../../utils/errors";
import { LogLevel, Logger } from "../../utils/logging";

export type StatusAttestation = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credential: Out<ObtainCredential>["credential"],
  context: {
    credentialCryptoContext: CryptoContext;
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{
  statusAttestation: string;
}>;

/**
 * WARNING: This function must be called after {@link startFlow}.
 * Verify the status of the credential attestation.
 * @param issuerConf - The issuer's configuration
 * @param credential - The credential to be verified
 * @param context.credentialCryptoContext - The credential's crypto context
 * @param context.wiaCryptoContext - The Wallet Attestation's crypto context
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @throws {IssuerResponseError} with a specific code for more context
 * @returns The credential status attestation
 */
export const statusAttestation: StatusAttestation = async (
  issuerConf,
  credential,
  ctx
) => {
  const { credentialCryptoContext, wiaCryptoContext, appFetch = fetch } = ctx;

  const jwk = await credentialCryptoContext.getPublicKey();
  const issuerJwk = await wiaCryptoContext.getPublicKey();
  const credentialHash = await getCredentialHashWithouDiscloures(credential);
  const statusAttUrl =
    issuerConf.openid_credential_issuer.status_attestation_endpoint;
  const credentialPop = await new SignJWT(credentialCryptoContext)
    .setPayload({
      iss: issuerJwk.kid,
      aud: statusAttUrl,
      jti: uuidv4().toString(),
      credential_hash: credentialHash,
      credential_hash_alg: "sha-256",
    })
    .setProtectedHeader({
      alg: "ES256",
      typ: "status-assertion-request+jwt",
      kid: jwk.kid,
    })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign();

  const body = {
    status_assertion_requests: [credentialPop],
  };

  Logger.log(LogLevel.DEBUG, `Credential pop: ${credentialPop}`);

  const result = await appFetch(statusAttUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then(hasStatusOrThrow(201))
    .then((raw) => raw.json())
    .then((json) => StatusAttestationResponse.parse(json))
    .catch(handleStatusAttestationError);

  return { statusAttestation: result.status_assertion_responses[0]! };
};

/**
 * Handle the status attestation error by mapping it to a custom exception.
 * If the error is not an instance of {@link UnexpectedStatusCodeError}, it is thrown as is.
 * @param e - The error to be handled
 * @throws {IssuerResponseError} with a specific code for more context
 */
const handleStatusAttestationError = (e: unknown) => {
  if (!(e instanceof UnexpectedStatusCodeError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(IssuerResponseError)
    .handle(404, {
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "Invalid status found for the given credential",
    })
    .handle("*", {
      code: IssuerResponseErrorCodes.StatusAttestationRequestFailed,
      message: `Unable to obtain the status attestation for the given credential`,
    })
    .buildFrom(e);
};
