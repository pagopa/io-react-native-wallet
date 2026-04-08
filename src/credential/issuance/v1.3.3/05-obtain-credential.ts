import { type CryptoContext, SignJWT } from "@pagopa/io-react-native-jwt";
import {
  createTokenDPoP,
  type CallbackContext,
  type JwtSignerJwk,
} from "@pagopa/io-wallet-oauth2";
import {
  fetchCredentialResponse,
  createCredentialRequest,
} from "@pagopa/io-wallet-oid4vci";
import { UnexpectedStatusCodeError as SdkUnexpectedStatusCodeError } from "@pagopa/io-wallet-utils";
import { hasStatusOrThrow, type Out } from "../../../utils/misc";
import {
  IoWalletError,
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
  ValidationFailed,
} from "../../../utils/errors";
import { LogLevel, Logger } from "../../../utils/logging";
import { sdkConfigV1_3 } from "../../../utils/config";
import { partialCallbacks } from "../../../utils/callbacks";
import type { IssuanceApi, IssuerConfig } from "../api";
import { NonceResponse } from "./types";
import type { AuthorizeAccessApi } from "../api/04-authorize-access";

type CreateRequestParams = {
  clientId: string;
  credentialIdentifier: string;
  accessToken: Out<AuthorizeAccessApi["authorizeAccess"]>["accessToken"];
  issuerConf: IssuerConfig;
  dPopCryptoContext: CryptoContext;
  credentialCryptoContexts: CryptoContext[];
  keyAttestationJwt: string;
  appFetch?: GlobalFetch["fetch"];
};

/**
 * Helper to create a credential request and fetch it from the issuer.
 *
 * When multiple keys are provided as {@link CryptoContext}, a batch is requested.
 *
 * @returns The raw credential response
 */
export const requestCredentials = async ({
  issuerConf,
  accessToken,
  credentialIdentifier,
  clientId,
  keyAttestationJwt,
  credentialCryptoContexts,
  dPopCryptoContext,
  appFetch = fetch,
}: CreateRequestParams) => {
  const { c_nonce } = await appFetch(issuerConf.nonce_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(NonceResponse.parse);

  const keys = await Promise.all(
    credentialCryptoContexts.map(async (ctx) => {
      const publicJwk = await ctx.getPublicKey();
      return { publicJwk, cryptoContext: ctx };
    })
  );

  const signJwt: CallbackContext["signJwt"] = async (
    jwtSigner,
    { header, payload }
  ) => {
    if (jwtSigner.method !== "jwk") {
      throw new IoWalletError(`Unsupported signer method: ${jwtSigner.method}`);
    }

    const { cryptoContext } =
      keys.find(({ publicJwk }) => publicJwk.kid === jwtSigner.publicJwk.kid) ??
      {};

    if (!cryptoContext) {
      throw new IoWalletError(
        `Could not find CryptoContext for key ${jwtSigner.publicJwk.kid}`
      );
    }

    return {
      jwt: await new SignJWT(cryptoContext)
        .setProtectedHeader(header)
        .setPayload(payload)
        .sign(),
      signerJwk: jwtSigner.publicJwk,
    };
  };

  const signers = keys.map<JwtSignerJwk>(({ publicJwk }) => ({
    alg: "ES256",
    method: "jwk",
    publicJwk,
  }));

  const credentialRequest = await createCredentialRequest({
    config: sdkConfigV1_3,
    callbacks: {
      hash: partialCallbacks.hash,
      signJwt,
    },
    clientId,
    credential_identifier: credentialIdentifier,
    issuerIdentifier: issuerConf.credential_issuer,
    maxBatchSize: issuerConf.credential_issuance_batch_size,
    nonce: c_nonce,
    keyAttestation: keyAttestationJwt,
    signers,
  });

  const dPopSignerJwk = await dPopCryptoContext.getPublicKey();

  const credentialDPoP = await createTokenDPoP({
    callbacks: {
      ...partialCallbacks,
      signJwt: async (_, payload) => ({
        jwt: await new SignJWT(dPopCryptoContext).setPayload(payload).sign(),
        signerJwk: dPopSignerJwk,
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

  return await fetchCredentialResponse({
    callbacks: {
      fetch: appFetch,
    },
    credentialEndpoint: issuerConf.credential_endpoint,
    credentialRequest: credentialRequest,
    accessToken: accessToken.access_token,
    dPoP: credentialDPoP.jwt,
  }).catch(handleObtainCredentialError);
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
    dPopCryptoContext,
    keyAttestationJwt,
    walletUnitAttestation,
    appFetch = fetch,
  } = context;
  if (!walletUnitAttestation) {
    throw new ValidationFailed({
      message:
        "The Wallet Unit Attestation is required to obtain the credential",
    });
  }

  const { credential_configuration_id, credential_identifier } =
    credentialDefinition;

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

  const credentialRes = await requestCredentials({
    issuerConf,
    accessToken,
    clientId,
    credentialCryptoContexts: [credentialCryptoContext],
    credentialIdentifier: credential_identifier!,
    dPopCryptoContext,
    keyAttestationJwt,
    appFetch,
  });

  Logger.log(
    LogLevel.DEBUG,
    `Credential Response: ${JSON.stringify(credentialRes)}`
  );

  // Extract the format corresponding to the credential_configuration_id used
  const issuerCredentialConfig =
    issuerConf.credential_configurations_supported[credential_configuration_id];

  if ("transaction_id" in credentialRes) {
    throw new IoWalletError("Deferred issuance is not currently supported");
  }

  return {
    credential: credentialRes.credentials.at(0)!.credential,
    format: issuerCredentialConfig!.format,
  };
};

export const obtainCredentialsBatch: IssuanceApi["obtainCredentialsBatch"] =
  async (issuerConf, accessToken, clientId, credentialDefinition, context) => {
    const {
      credentialCryptoContexts,
      dPopCryptoContext,
      keyAttestationJwt,
      appFetch = fetch,
    } = context;
    const { credential_configuration_id, credential_identifier } =
      credentialDefinition;

    const credentialRes = await requestCredentials({
      issuerConf,
      accessToken,
      clientId,
      credentialCryptoContexts,
      credentialIdentifier: credential_identifier,
      dPopCryptoContext,
      keyAttestationJwt,
      appFetch,
    });

    // Extract the format corresponding to the credential_configuration_id used
    const issuerCredentialConfig =
      issuerConf.credential_configurations_supported[
        credential_configuration_id
      ];

    if ("transaction_id" in credentialRes) {
      throw new IoWalletError("Deferred issuance is not currently supported");
    }

    return credentialRes.credentials.map(({ credential }) => ({
      credential,
      format: issuerCredentialConfig!.format,
    }));
  };

/**
 * Handle the credential error by mapping it to a custom exception.
 * If the error is not an instance of {@link SdkUnexpectedStatusCodeError}, it is thrown as is.
 * @param e - The error to be handled
 * @throws {IssuerResponseError} with a specific code for more context
 */
const handleObtainCredentialError = (e: unknown) => {
  Logger.log(LogLevel.ERROR, `Error occurred while obtaining credential: ${e}`);

  if (!(e instanceof SdkUnexpectedStatusCodeError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(IssuerResponseError)
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
