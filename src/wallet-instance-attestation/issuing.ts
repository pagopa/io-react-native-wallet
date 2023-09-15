import {
  type CryptoContext,
  decode as decodeJwt,
} from "@pagopa/io-react-native-jwt";
import { verify as verifyJwt } from "@pagopa/io-react-native-jwt";
import { SignJWT, thumbprint } from "@pagopa/io-react-native-jwt";
import { JWK, fixBase64EncodingOnKey } from "../utils/jwk";
import { WalletInstanceAttestationRequestJwt } from "./types";
import uuid from "react-native-uuid";
import { WalletInstanceAttestationIssuingError } from "../utils/errors";

export class Issuing {
  walletProviderBaseUrl: string;
  wiaCryptoContext: CryptoContext;
  appFetch: GlobalFetch["fetch"];
  constructor(
    walletProviderBaseUrl: string,
    wiaCryptoContext: CryptoContext,
    appFetch: GlobalFetch["fetch"] = fetch
  ) {
    this.walletProviderBaseUrl = walletProviderBaseUrl;
    this.wiaCryptoContext = wiaCryptoContext;
    this.appFetch = appFetch;
  }

  /**
   * Get the Wallet Instance Attestation Request to sign
   *
   * @async @function
   *
   * @returns {string} Wallet Instance Attestation Request to sign
   *
   */
  private async getAttestationRequest(): Promise<string> {
    const jwk = await this.wiaCryptoContext.getPublicKey();
    const parsedJwk = JWK.parse(jwk);
    const keyThumbprint = await thumbprint(parsedJwk);
    const publicKey = { ...parsedJwk, kid: keyThumbprint };

    return new SignJWT(this.wiaCryptoContext)
      .setPayload({
        iss: keyThumbprint,
        aud: this.walletProviderBaseUrl,
        jti: `${uuid.v4()}`,
        nonce: `${uuid.v4()}`,
        cnf: {
          jwk: fixBase64EncodingOnKey(publicKey),
        },
      })
      .setProtectedHeader({
        kid: publicKey.kid,
        typ: "wiar+jwt",
      })
      .setPayload({
        iss: keyThumbprint,
        sub: this.walletProviderBaseUrl,
        jti: `${uuid.v4()}`,
        type: "WalletInstanceAttestationRequest",
        cnf: {
          jwk: fixBase64EncodingOnKey(publicKey),
        },
      })

      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();
  }

  /**
   * Get the Wallet Instance Attestation given a
   * Wallet Instance Attestation Request and signature
   *
   * @async @function
   *
   * @returns {string} Wallet Instance Attestation
   *
   */
  async getAttestation(): Promise<string> {
    const signedAttestationRequest = await this.getAttestationRequest();

    const decodedRequest = decodeJwt(signedAttestationRequest);
    const parsedRequest = WalletInstanceAttestationRequestJwt.parse({
      payload: decodedRequest.payload,
      header: decodedRequest.protectedHeader,
    });
    const publicKey = parsedRequest.payload.cnf.jwk;

    await verifyJwt(signedAttestationRequest, publicKey);

    const tokenUrl = new URL("token", this.walletProviderBaseUrl).href;
    const requestBody = {
      grant_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-client-attestation",
      assertion: signedAttestationRequest,
    };
    const response = await this.appFetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 201) {
      return await response.text();
    }

    throw new WalletInstanceAttestationIssuingError(
      "Unable to obtain wallet instance attestation from wallet provider",
      `Response code: ${response.status}`
    );
  }
}
