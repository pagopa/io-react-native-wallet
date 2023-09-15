import {
  decode as decodeJwt,
  verify as verifyJwt,
  sha256ToBase64,
  type CryptoContext,
  SignJWT,
  thumbprint,
} from "@pagopa/io-react-native-jwt";
import { JWK } from "../utils/jwk";
import uuid from "react-native-uuid";
import { PidIssuingError, PidMetadataError } from "../utils/errors";
import { createDPopToken } from "../utils/dpop";
import { PidIssuerEntityConfiguration } from "./metadata";

// This is a temporary type that will be used for demo purposes only
export type CieData = {
  birthDate: string;
  fiscalCode: string;
  name: string;
  surname: string;
};

export type TokenResponse = { access_token: string; c_nonce: string };
export type PidResponse = {
  credential: string;
  c_nonce: string;
  c_nonce_expires_in: number;
  format: string;
};

export class Issuing {
  pidProviderBaseUrl: string;
  walletProviderBaseUrl: string;
  walletInstanceAttestation: string;
  codeVerifier: string;
  clientId: string;
  state: string;
  authorizationCode: string;
  pidCryptoContext: CryptoContext;
  tokenUrl: string;
  appFetch: GlobalFetch["fetch"];

  constructor(
    pidProviderBaseUrl: string,
    walletProviderBaseUrl: string,
    walletInstanceAttestation: string,
    clientId: string,
    pidCryptoContext: CryptoContext,
    appFetch: GlobalFetch["fetch"] = fetch
  ) {
    this.pidProviderBaseUrl = pidProviderBaseUrl;
    this.walletProviderBaseUrl = walletProviderBaseUrl;
    this.state = `${uuid.v4()}`;
    this.codeVerifier = `${uuid.v4()}`;
    this.authorizationCode = `${uuid.v4()}`;
    this.walletInstanceAttestation = walletInstanceAttestation;
    this.clientId = clientId;
    this.pidCryptoContext = pidCryptoContext;
    this.tokenUrl = new URL("/token", this.pidProviderBaseUrl).href;
    this.appFetch = appFetch;
  }

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
  async getPar(jwk: JWK, crypto: CryptoContext): Promise<string> {
    const parsedJwk = JWK.parse(jwk);
    const keyThumbprint = await thumbprint(parsedJwk);
    const publicKey = { ...parsedJwk, kid: keyThumbprint };
    const codeChallenge = await sha256ToBase64(this.codeVerifier);

    const signedJwtForPar = await new SignJWT(crypto)
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
        redirect_uri: this.walletProviderBaseUrl,
        state: this.state,
        client_id: this.clientId,
        code_challenge: codeChallenge,
      })
      .setProtectedHeader({
        kid: publicKey.kid,
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();

    const parUrl = new URL("/as/par", this.pidProviderBaseUrl).href;

    const requestBody = {
      response_type: "code",
      client_id: this.clientId,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: this.walletInstanceAttestation,
      request: signedJwtForPar,
    };

    var formBody = new URLSearchParams(requestBody);

    const response = await this.appFetch(parUrl, {
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
  }

  /**
   * Make an auth token request to the PID issuer
   *
   * @function
   * @returns a token response
   *
   */
  async getAuthToken(): Promise<TokenResponse> {
    const signedDPop = await createDPopToken({
      htm: "POST",
      htu: this.tokenUrl,
      jti: `${uuid.v4()}`,
    });

    const requestBody = {
      grant_type: "authorization code",
      client_id: this.clientId,
      code: this.authorizationCode,
      code_verifier: this.codeVerifier,
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: this.walletInstanceAttestation,
      redirect_uri: this.walletProviderBaseUrl,
    };
    var formBody = new URLSearchParams(requestBody);

    const response = await this.appFetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        DPoP: signedDPop,
      },
      body: formBody.toString(),
    });

    if (response.status === 200) {
      return await response.json();
    }

    throw new PidIssuingError(
      `Unable to obtain token. Response code: ${await response.text()}`
    );
  }

  /**
   * Return the unsigned jwt for nonce proof of possession
   *
   * @function
   * @param nonce the nonce
   *
   * @returns Unsigned JWT for nonce proof
   *
   */
  async getUnsignedNonceProof(nonce: string): Promise<string> {
    const unsignedProof = new SignJWT({
      nonce,
    })
      .setProtectedHeader({
        alg: "ES256",
        type: "openid4vci-proof+jwt",
      })
      .setAudience(this.walletProviderBaseUrl)
      .setIssuer(this.clientId)
      .setIssuedAt()
      .setExpirationTime("1h")
      .toSign();
    return unsignedProof;
  }

  /**
   * Make the credential issuing request to the PID issuer
   *
   * @function
   * @param unsignedNonceProof The unsigned JWT for nonce proof
   * @param nonceProofSignature The JWT for nonce proof signature
   * @param accessToken The access token obtained with getAuthToken
   * @param cieData Personal data read by the CIE
   *
   * @returns a credential
   *
   */
  async getCredential(
    unsignedNonceProof: string,
    nonceProofSignature: string,
    accessToken: string,
    cieData: CieData
  ): Promise<PidResponse> {
    const signedDPopForPid = await createDPopToken(
      {
        htm: "POST",
        htu: this.tokenUrl,
        jti: `${uuid.v4()}`,
      },
      this.pidCryptoContext
    );
    const signedNonceProof = await SignJWT.appendSignature(
      unsignedNonceProof,
      nonceProofSignature
    );
    const credentialUrl = new URL("/credential", this.pidProviderBaseUrl).href;

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

    const response = await this.appFetch(credentialUrl, {
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

    throw new PidIssuingError(`Unable to obtain credential!`);
  }

  /**
   * Obtain the PID issuer metadata
   *
   * @function
   * @returns PID issuer metadata
   *
   */
  async getEntityConfiguration(): Promise<PidIssuerEntityConfiguration> {
    const metadataUrl = new URL(
      ".well-known/openid-federation",
      this.pidProviderBaseUrl
    ).href;

    const response = await this.appFetch(metadataUrl);

    if (response.status === 200) {
      const jwtMetadata = await response.text();
      const { payload } = decodeJwt(jwtMetadata);
      const result = PidIssuerEntityConfiguration.safeParse(payload);
      if (result.success) {
        const parsedMetadata = result.data;
        await verifyJwt(jwtMetadata, parsedMetadata.jwks.keys);
        return parsedMetadata;
      } else {
        throw new PidMetadataError(result.error.message);
      }
    }

    throw new PidMetadataError(
      `Unable to obtain PID metadata. Response: ${await response.text()} with status: ${
        response.status
      }`
    );
  }
}
