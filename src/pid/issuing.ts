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
  state: string;
  authorizationCode: string;
  pidCryptoContext: CryptoContext;
  wiaCryptoContext: CryptoContext;
  tokenUrl: string;
  appFetch: GlobalFetch["fetch"];

  constructor(
    pidProviderBaseUrl: string,
    walletProviderBaseUrl: string,
    walletInstanceAttestation: string,
    pidCryptoContext: CryptoContext,
    wiaCryptoContext: CryptoContext,
    appFetch: GlobalFetch["fetch"] = fetch
  ) {
    this.pidProviderBaseUrl = pidProviderBaseUrl;
    this.walletProviderBaseUrl = walletProviderBaseUrl;
    this.state = `${uuid.v4()}`;
    this.codeVerifier = `${uuid.v4()}`;
    this.authorizationCode = `${uuid.v4()}`;
    this.walletInstanceAttestation = walletInstanceAttestation;
    this.pidCryptoContext = pidCryptoContext;
    this.wiaCryptoContext = wiaCryptoContext;
    this.tokenUrl = new URL("/token", this.pidProviderBaseUrl).href;
    this.appFetch = appFetch;
  }

  private async getClientId() {
    return this.wiaCryptoContext.getPublicKey().then(thumbprint);
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
  async getPar(): Promise<string> {
    const clientId = await this.getClientId();

    // Calculate the thumbprint of the public key of the Wallet Instance Attestation.
    // The PAR request token is signed used the Wallet Instance Attestation key.
    // The signature can be verified by reading the public key from the key set shippet with the it will ship the Wallet Instance Attestation;
    //  key is matched by its kid, which is supposed to be the thumbprint of its public key.
    const keyThumbprint = await this.wiaCryptoContext
      .getPublicKey()
      .then(JWK.parse)
      .then(thumbprint);

    const codeChallenge = await sha256ToBase64(this.codeVerifier);

    const signedJwtForPar = await new SignJWT(this.wiaCryptoContext)
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
        redirect_uri: this.walletProviderBaseUrl,
        state: this.state,
        client_id: clientId,
        code_challenge: codeChallenge,
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();

    const parUrl = new URL("/as/par", this.pidProviderBaseUrl).href;

    const requestBody = {
      response_type: "code",
      client_id: clientId,
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
    const clientId = await this.getClientId();

    const signedDPop = await createDPopToken({
      htm: "POST",
      htu: this.tokenUrl,
      jti: `${uuid.v4()}`,
    });

    const requestBody = {
      grant_type: "authorization code",
      client_id: clientId,
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
   * Return the signed jwt for nonce proof of possession
   *
   * @function
   * @param nonce the nonce
   *
   * @returns signed JWT for nonce proof
   *
   */
  async createNonceProof(nonce: string): Promise<string> {
    const clientId = await this.getClientId();

    return new SignJWT(this.pidCryptoContext)
      .setPayload({
        nonce,
      })
      .setProtectedHeader({
        type: "openid4vci-proof+jwt",
      })
      .setAudience(this.walletProviderBaseUrl)
      .setIssuer(clientId)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();
  }

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
  async getCredential(
    authTokenNonce: string,
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
    const signedNonceProof = await this.createNonceProof(authTokenNonce);

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
      "ci/.well-known/openid-federation",
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
