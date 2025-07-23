import {
  getCredentialHashWithouDiscloures,
  hasStatusOrThrow,
  type Out,
} from "../../utils/misc";
import type { EvaluateIssuerTrust, ObtainCredential } from "../issuance";
import { type CryptoContext, SignJWT } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";
import { StatusAssertionResponse } from "./types";
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
} from "../../utils/errors";
import { Logger, LogLevel } from "../../utils/logging";
import { extractJwkFromCredential } from "../../utils/credentials";

export type StatusAssertion = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credential: Out<ObtainCredential>["credential"],
  format: Out<ObtainCredential>["format"],
  context: {
    credentialCryptoContext: CryptoContext;
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{
  statusAssertion: string;
}>;

/**
 * Get the status assertion of a digital credential.
 * @param issuerConf - The issuer's configuration
 * @param credential - The credential to be verified
 * @param format - The format of the credential, e.g. "sd-jwt"
 * @param context.credentialCryptoContext - The credential's crypto context
 * @param context.wiaCryptoContext - The Wallet Attestation's crypto context
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @throws {IssuerResponseError} with a specific code for more context
 * @returns The credential status assertion
 */
export const statusAssertion: StatusAssertion = async (
  issuerConf,
  credential,
  format,
  ctx
) => {
  const { credentialCryptoContext, wiaCryptoContext, appFetch = fetch } = ctx;

  const jwk = await extractJwkFromCredential(credential, format);
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
    .then(hasStatusOrThrow(200))
    .then((raw) => raw.json())
    .then((json) => StatusAssertionResponse.parse(json))
    .catch(handleStatusAssertionError);

  const [statusAttestationJwt] = result.status_assertion_responses;

  return { statusAssertion: statusAttestationJwt! };
};

/**
 * Handle the status assertion error by mapping it to a custom exception.
 * If the error is not an instance of {@link UnexpectedStatusCodeError}, it is thrown as is.
 * @param e - The error to be handled
 * @throws {IssuerResponseError} with a specific code for more context
 */
const handleStatusAssertionError = (e: unknown) => {
  if (!(e instanceof UnexpectedStatusCodeError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(IssuerResponseError)
    .handle("*", {
      code: IssuerResponseErrorCodes.StatusAttestationRequestFailed,
      message: `Unable to obtain the status assertion for the given credential`,
    })
    .buildFrom(e);
};
