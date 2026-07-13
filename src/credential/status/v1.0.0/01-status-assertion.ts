import { SignJWT } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";

import type { StatusAssertionApi } from "../api/status-assertion";

import { extractJwkFromCredential } from "../../../utils/credentials";
import {
  IoWalletError,
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
} from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import {
  getCredentialHashWithouDiscloures,
  hasStatusOrThrow,
} from "../../../utils/misc";
import { StatusAssertionResponse } from "./types";

export const getStatusAssertion: StatusAssertionApi["get"] = async (
  issuerConf,
  credential,
  format,
  ctx,
) => {
  const { appFetch = fetch, credentialCryptoContext, wiaCryptoContext } = ctx;

  const jwk = await extractJwkFromCredential(credential, format);
  const issuerJwk = await wiaCryptoContext.getPublicKey();
  const credentialHash = await getCredentialHashWithouDiscloures(credential);
  const statusAttUrl = issuerConf.status_assertion_endpoint;

  if (!statusAttUrl) {
    throw new IoWalletError(
      "Status assertion endpoint not found in the Issuer configuration",
    );
  }

  const credentialPop = await new SignJWT(credentialCryptoContext)
    .setPayload({
      aud: statusAttUrl,
      credential_hash: credentialHash,
      credential_hash_alg: "sha-256",
      iss: issuerJwk.kid,
      jti: uuidv4().toString(),
    })
    .setProtectedHeader({
      alg: "ES256",
      kid: jwk.kid,
      typ: "status-assertion-request+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign();

  const body = {
    status_assertion_requests: [credentialPop],
  };

  Logger.log(LogLevel.DEBUG, `Credential pop: ${credentialPop}`);

  const result = await appFetch(statusAttUrl, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
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
