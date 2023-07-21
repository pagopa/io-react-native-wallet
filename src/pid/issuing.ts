import {
  decode as decodeJwt,
  sha256ToBase64,
} from "@pagopa/io-react-native-jwt";

import { SignJWT, thumbprint } from "@pagopa/io-react-native-jwt";
import { JWK } from "../utils/jwk";
import uuid from "react-native-uuid";
import { IoWalletError } from "../utils/errors";

export type TokenResponse = { access_token: string; c_nonce: string };

export class Issuing {
  pidProviderBaseUrl: string;
  walletProviderBaseUrl: string;
  walletInstanceAttestation: string;
  codeVerifier: string;
  clientId: string;
  state: string;
  authorizationCode: string;

  constructor(
    pidProviderBaseUrl: string,
    walletProviderBaseUrl: string,
    walletInstanceAttestation: string,
    clientId: string
  ) {
    this.pidProviderBaseUrl = pidProviderBaseUrl;
    this.walletProviderBaseUrl = walletProviderBaseUrl;
    this.state = `${uuid.v4()}`;
    this.codeVerifier = `${uuid.v4()}`;
    this.authorizationCode = `${uuid.v4()}`;
    this.walletInstanceAttestation = walletInstanceAttestation;
    this.clientId = clientId;
  }

  async getUnsignedJwtForPar(jwk: JWK): Promise<string> {
    const parsedJwk = JWK.parse(jwk);
    const keyThumbprint = await thumbprint(parsedJwk);
    const publicKey = { ...parsedJwk, kid: keyThumbprint };
    const codeChallenge = await sha256ToBase64(this.codeVerifier);

    const unsignedJwtForPar = new SignJWT({
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
        alg: "ES256",
        kid: publicKey.kid,
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .toSign();

    return unsignedJwtForPar;
  }

  async getPar(
    unsignedJwtForPar: string,
    signature: string,
    appFetch: GlobalFetch = { fetch }
  ): Promise<string> {
    const codeChallenge = await sha256ToBase64(this.codeVerifier);
    const signedJwtForPar = await SignJWT.appendSignature(
      unsignedJwtForPar,
      signature
    );

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

    const response = await appFetch.fetch(parUrl, {
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

    throw new IoWalletError(
      `Unable to obtain PAR. Response code: ${await response.text()}`
    );
  }

  async getUnsignedDPop(jwk: JWK): Promise<string> {
    const tokenUrl = new URL("/token", this.pidProviderBaseUrl).href;
    const dPop = new SignJWT({
      htm: "POST",
      htu: tokenUrl,
      jti: `${uuid.v4()}`,
    })
      .setProtectedHeader({
        alg: "ES256",
        type: "dpop+jwt",
        jwk,
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .toSign();
    return dPop;
  }

  async getAuthToken(
    unsignedDPopForToken: string,
    signature: string,
    appFetch: GlobalFetch = { fetch }
  ): Promise<TokenResponse> {
    let signedDPop = await SignJWT.appendSignature(
      unsignedDPopForToken,
      signature
    );
    const decodedJwtDPop = decodeJwt(signedDPop);
    const tokenUrl = decodedJwtDPop.payload.htu as string;
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

    const response = await appFetch.fetch(tokenUrl, {
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

    throw new IoWalletError(
      `Unable to obtain token. Response code: ${await response.text()}`
    );
  }

  async getUnsignedProof(nonce: string): Promise<string> {
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

  async getCredential(
    unsignedDPopForPid: string,
    dPopPidSignature: string,
    unsignedProof: string,
    signature: string,
    accessToken: string,
    cieData: any,
    appFetch: GlobalFetch = { fetch }
  ): Promise<TokenResponse> {
    const signedDPopForPid = await SignJWT.appendSignature(
      unsignedDPopForPid,
      dPopPidSignature
    );
    const signedProof = await SignJWT.appendSignature(unsignedProof, signature);
    const credentialUrl = new URL("/credential", this.pidProviderBaseUrl).href;

    const requestBody = {
      credential_definition: JSON.stringify({ type: ["eu.eudiw.pid.it"] }),
      format: "vc+sd-jwt",
      proof: JSON.stringify({
        jwt: signedProof,
        cieData,
        proof_type: "jwt",
      }),
    };
    var formBody = new URLSearchParams(requestBody);

    const response = await appFetch.fetch(credentialUrl, {
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

    throw new IoWalletError(`Unable to obtain credential`);
  }
}
