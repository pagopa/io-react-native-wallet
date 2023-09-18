import {
  sha256ToBase64,
  type CryptoContext,
  SignJWT,
  thumbprint,
} from "@pagopa/io-react-native-jwt";
import { JWK } from "../utils/jwk";
import uuid from "react-native-uuid";
import { PidIssuingError } from "../utils/errors";
import { createDPopToken } from "../utils/dpop";
import type { PidIssuerEntityConfiguration } from "./metadata";

// This is a temporary type that will be used for demo purposes only
export type CieData = {
  birthDate: string;
  fiscalCode: string;
  name: string;
  surname: string;
};

export type AuthorizationConf = {
  accessToken: string;
  nonce: string;
  clientId: string;
  authorizationCode: string;
  codeVerifier: string;
  walletProviderBaseUrl: string;
};

export type PidResponse = {
  credential: string;
  c_nonce: string;
  c_nonce_expires_in: number;
  format: string;
};

/**
 * Make a PAR request to the PID issuer and return the response url
 *
 * @function
 * @param jwk The wallet instance attestation public JWK
 * @param crypto The CryptoContext instance for the key pair to sign PAR
 *
 * @returns Unsigned PAR url
 *
 */
const getPar =
  ({
    wiaCryptoContext,
    appFetch = fetch,
  }: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }) =>
  async (
    clientId: string,
    codeVerifier: string,
    walletProviderBaseUrl: string,
    pidProviderEntityConfiguration: PidIssuerEntityConfiguration,
    walletInstanceAttestation: string
  ): Promise<string> => {
    // Calculate the thumbprint of the public key of the Wallet Instance Attestation.
    // The PAR request token is signed used the Wallet Instance Attestation key.
    // The signature can be verified by reading the public key from the key set shippet with the it will ship the Wallet Instance Attestation;
    //  key is matched by its kid, which is supposed to be the thumbprint of its public key.
    const keyThumbprint = await wiaCryptoContext
      .getPublicKey()
      .then(JWK.parse)
      .then(thumbprint);

    const codeChallenge = await sha256ToBase64(codeVerifier);

    const signedJwtForPar = await new SignJWT(wiaCryptoContext)
      .setProtectedHeader({
        kid: keyThumbprint,
      })
      .setPayload({
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        authorization_details: [
          {
            credentialDefinition: {
              type: ["eu.eudiw.pid.it"],
            },
            format: "vc+sd-jwt",
            type: "type",
          },
        ],
        response_type: "code",
        code_challenge_method: "s256",
        redirect_uri: walletProviderBaseUrl,
        state: `${uuid.v4()}`,
        client_id: clientId,
        code_challenge: codeChallenge,
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();

    const parUrl =
      pidProviderEntityConfiguration.metadata.openid_credential_issuer
        .pushed_authorization_request_endpoint;

    const requestBody = {
      response_type: "code",
      client_id: clientId,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: walletInstanceAttestation,
      request: signedJwtForPar,
    };

    var formBody = new URLSearchParams(requestBody);

    const response = await appFetch(parUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    if (response.status === 201) {
      const result = await response.json();
      return result.request_uri;
    }

    throw new PidIssuingError(
      `Unable to obtain PAR. Response code: ${await response.text()}`
    );
  };

/**
 * Make an auth token request to the PID issuer
 *
 * @function
 * @returns a token response
 *
 */
export const getAuthToken =
  ({
    wiaCryptoContext,
    appFetch = fetch,
  }: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }) =>
  async (
    walletInstanceAttestation: string,
    walletProviderBaseUrl: string,
    pidProviderEntityConfiguration: PidIssuerEntityConfiguration
  ): Promise<AuthorizationConf> => {
    // FIXME: do better
    const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
    const codeVerifier = `${uuid.v4()}`;
    const authorizationCode = `${uuid.v4()}`;
    const tokenUrl =
      pidProviderEntityConfiguration.metadata.openid_credential_issuer
        .token_endpoint;

    await getPar({ wiaCryptoContext, appFetch })(
      clientId,
      codeVerifier,
      walletProviderBaseUrl,
      pidProviderEntityConfiguration,
      walletInstanceAttestation
    );

    const signedDPop = await createDPopToken({
      htm: "POST",
      htu: tokenUrl,
      jti: `${uuid.v4()}`,
    });

    const requestBody = {
      grant_type: "authorization code",
      client_id: clientId,
      code: authorizationCode,
      code_verifier: codeVerifier,
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: walletInstanceAttestation,
      redirect_uri: walletProviderBaseUrl,
    };
    var formBody = new URLSearchParams(requestBody);

    const response = await appFetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        DPoP: signedDPop,
      },
      body: formBody.toString(),
    });

    if (response.status === 200) {
      const { c_nonce, access_token } = await response.json();
      return {
        accessToken: access_token,
        nonce: c_nonce,
        clientId,
        codeVerifier,
        authorizationCode,
        walletProviderBaseUrl,
      };
    }

    throw new PidIssuingError(
      `Unable to obtain token. Response code: ${await response.text()}`
    );
  };

/**
 * Return the signed jwt for nonce proof of possession
 *
 * @function
 * @param nonce the nonce
 *
 * @returns signed JWT for nonce proof
 *
 */
const createNonceProof = async (
  nonce: string,
  issuer: string,
  audience: string,
  ctx: CryptoContext
): Promise<string> => {
  return new SignJWT(ctx)
    .setPayload({
      nonce,
    })
    .setProtectedHeader({
      type: "openid4vci-proof+jwt",
    })
    .setAudience(audience)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();
};

/**
 * Make the credential issuing request to the PID issuer
 *
 * @function
 * @param authTokenNonce The nonce value received from the auth token
 * @param accessToken The access token obtained with getAuthToken
 * @param cieData Personal data read by the CIE
 *
 * @returns a credential
 *
 */
export const getCredential =
  ({
    pidCryptoContext,
    appFetch = fetch,
  }: {
    pidCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }) =>
  async (
    { nonce, accessToken, clientId, walletProviderBaseUrl }: AuthorizationConf,
    pidProviderEntityConfiguration: PidIssuerEntityConfiguration,
    cieData: CieData
  ): Promise<PidResponse> => {
    const signedDPopForPid = await createDPopToken(
      {
        htm: "POST",
        htu: pidProviderEntityConfiguration.metadata.openid_credential_issuer
          .token_endpoint,
        jti: `${uuid.v4()}`,
      },
      pidCryptoContext
    );
    const signedNonceProof = await createNonceProof(
      nonce,
      walletProviderBaseUrl,
      clientId,
      pidCryptoContext
    );

    const credentialUrl =
      pidProviderEntityConfiguration.metadata.openid_credential_issuer
        .credential_endpoint;

    const requestBody = {
      credential_definition: JSON.stringify({ type: ["eu.eudiw.pid.it"] }),
      format: "vc+sd-jwt",
      proof: JSON.stringify({
        jwt: signedNonceProof,
        cieData,
        proof_type: "jwt",
      }),
    };
    const formBody = new URLSearchParams(requestBody);

    const response = await appFetch(credentialUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        DPoP: signedDPopForPid,
        Authorization: accessToken,
      },
      body: formBody.toString(),
    });

    if (response.status === 200) {
      return await response.json();
    }

    throw new PidIssuingError(
      `Unable to obtain credential! url=${credentialUrl} status=${
        response.status
      } body=${await response.text()}`
    );
  };
