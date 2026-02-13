import { type CryptoContext, SignJWT } from "@pagopa/io-react-native-jwt";
import { hasStatusOrThrow } from "../../../utils/misc";
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
  ValidationFailed,
} from "../../../utils/errors";
import { LogLevel, Logger } from "../../../utils/logging";
import type { IssuanceApi } from "../api";
import { NonceResponse } from "./types";
import { createCredentialRequest } from "@pagopa/io-wallet-oid4vci";
import { sdkConfigV1_3 } from "../../../utils/config";
import { partialCallbacks } from "../../../utils/callbacks";
import { createTokenDPoP } from "@pagopa/io-wallet-oauth2";
import { fetchCredentialResponse } from "@pagopa/io-wallet-oid4vci";

export const createNonceProof = async (
  nonce: string,
  issuer: string,
  audience: string,
  ctx: CryptoContext
): Promise<string> => {
  const jwk = await ctx.getPublicKey();
  return new SignJWT(ctx)
    .setPayload({
      nonce,
    })
    .setProtectedHeader({
      typ: "openid4vci-proof+jwt",
      jwk,
    })
    .setAudience(audience)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime("5min")
    .sign();
};

export const obtainCredential: IssuanceApi["obtainCredential"] = async (
  issuerConf,
  accessToken,
  clientId,
  credentialDefinition,
  context
) => {
  const {
    credentialCryptoContext,
    appFetch = fetch,
    dPopCryptoContext,
  } = context;
  const { credential_configuration_id, credential_identifier } =
    credentialDefinition;

  // Fetch the nonce from the Credential Issuer
  const { c_nonce } = await appFetch(issuerConf.nonce_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((body) => NonceResponse.parse(body));

  // Validation of accessTokenResponse.authorization_details if contain credentialDefinition
  const containsCredentialDefinition = accessToken.authorization_details.some(
    (c) =>
      c.credential_configuration_id === credential_configuration_id &&
      (credential_identifier
        ? c.credential_identifiers.includes(credential_identifier)
        : true)
  );

  if (!containsCredentialDefinition) {
    Logger.log(
      LogLevel.ERROR,
      `Credential definition not found in the access token response ${accessToken.authorization_details}`
    );
    throw new ValidationFailed({
      message:
        "The access token response does not contain the requested credential",
    });
  }

  const signerJwk = await credentialCryptoContext.getPublicKey();

  const credentialRequest = await createCredentialRequest({
    config: sdkConfigV1_3,
    callbacks: {
      signJwt: async (_, payload) => ({
        jwt: await new SignJWT(credentialCryptoContext)
          .setPayload(payload)
          .sign(),
        signerJwk,
      }),
    },
    clientId,
    credential_identifier: credentialDefinition.credential_identifier!,
    issuerIdentifier: issuerConf.credential_issuer,
    nonce: c_nonce,
    keyAttestation: "", // TODO
    signer: {
      alg: "ES256",
      method: "jwk",
      publicJwk: signerJwk,
    },
  });

  const dPopSignerJwk = await dPopCryptoContext.getPublicKey();

  const credentialDPoP = await createTokenDPoP({
    callbacks: {
      ...partialCallbacks,
      signJwt: async (_, payload) => ({
        jwt: await new SignJWT(dPopCryptoContext).setPayload(payload).sign(),
        signerJwk,
      }),
    },
    signer: {
      method: "jwk",
      alg: "ES256",
      publicJwk: dPopSignerJwk,
    },
    tokenRequest: {
      method: "POST",
      url: issuerConf.credential_endpoint,
    },
    accessToken: accessToken.access_token,
  });

  // TODO: handle issuance errors
  const credentialRes = await fetchCredentialResponse({
    callbacks: {
      fetch: appFetch,
    },
    credentialEndpoint: issuerConf.credential_endpoint,
    credentialRequest: credentialRequest,
    accessToken: accessToken.access_token,
    dPoP: credentialDPoP.jwt,
  });

  Logger.log(
    LogLevel.DEBUG,
    `Credential Response: ${JSON.stringify(credentialRes)}`
  );

  // Extract the format corresponding to the credential_configuration_id used
  const issuerCredentialConfig =
    issuerConf.credential_configurations_supported[credential_configuration_id];

  // TODO: [SIW-2264] Handle multiple credentials
  return {
    credential: credentialRes.credentials!.at(0)!.credential,
    format: issuerCredentialConfig!.format,
  };
};

/**
 * Handle the credential error by mapping it to a custom exception.
 * If the error is not an instance of {@link UnexpectedStatusCodeError}, it is thrown as is.
 * @param e - The error to be handled
 * @throws {IssuerResponseError} with a specific code for more context
 */
const handleObtainCredentialError = (e: unknown) => {
  Logger.log(LogLevel.ERROR, `Error occurred while obtaining credential: ${e}`);

  if (!(e instanceof UnexpectedStatusCodeError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(IssuerResponseError)
    .handle(201, {
      // Although it is technically not an error, we handle it as such to avoid
      // changing the return type of `obtainCredential` and introduce a breaking change.
      code: IssuerResponseErrorCodes.CredentialIssuingNotSynchronous,
      message:
        "This credential cannot be issued synchronously. It will be available at a later time.",
    })
    .handle(403, {
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "Invalid status found for the given credential",
    })
    .handle(404, {
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "Invalid status found for the given credential",
    })
    .handle("*", {
      code: IssuerResponseErrorCodes.CredentialRequestFailed,
      message: "Unable to obtain the requested credential",
    })
    .buildFrom(e);
};
