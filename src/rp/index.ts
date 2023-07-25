import { AuthRequestDecodeError, IoWalletError } from "../utils/errors";
import {
  decode as decodeJwt,
  decodeBase64,
  sha256ToBase64,
  SignJWT,
} from "@pagopa/io-react-native-jwt";
import { RequestObject, RpEntityConfiguration } from "./types";

import uuid from "react-native-uuid";
import type { JWK } from "@pagopa/io-react-native-jwt/lib/typescript/types";

export class RelyingPartySolution {
  relyingPartyBaseUrl: string;
  walletInstanceAttestation: string;
  appFetch: GlobalFetch["fetch"];

  constructor(
    relyingPartyBaseUrl: string,
    walletInstanceAttestation: string,
    appFetch: GlobalFetch["fetch"] = fetch
  ) {
    this.relyingPartyBaseUrl = relyingPartyBaseUrl;
    this.walletInstanceAttestation = walletInstanceAttestation;
    this.appFetch = appFetch;
  }

  /**
   * Decode a QR code content to an authentication request url.
   * @function
   * @param qrcode QR code content
   *
   * @returns The authentication request url
   *
   */
  decodeAuthRequestQR(qrcode: string): string {
    try {
      let decoded = decodeBase64(qrcode);
      let decodedUrl = new URL(decoded);
      let requestUri = decodedUrl.searchParams.get("request_uri");
      if (requestUri) {
        return requestUri;
      } else {
        throw new AuthRequestDecodeError(
          "Unable to obtain request_uri from QR code",
          `${decodedUrl}`
        );
      }
    } catch {
      throw new AuthRequestDecodeError(
        "Unable to decode QR code authentication request url",
        qrcode
      );
    }
  }
  /**
   * Obtain the unsigned wallet instance DPoP for authentication request
   *
   * @function
   * @param walletInstanceAttestationJwk JWT of the Wallet Instance Attestation
   * @param authRequestUrl authentication request url
   *
   * @returns The unsigned wallet instance DPoP
   *
   */
  async getUnsignedWalletInstanceDPoP(
    walletInstanceAttestationJwk: JWK,
    authRequestUrl: string
  ): Promise<string> {
    return await new SignJWT({
      jti: `${uuid.v4()}`,
      htm: "GET",
      htu: authRequestUrl,
      ath: await sha256ToBase64(this.walletInstanceAttestation),
    })
      .setProtectedHeader({
        alg: "ES256",
        jwk: walletInstanceAttestationJwk,
        typ: "dpop+jwt",
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .toSign();
  }

  /**
   * Obtain the Request Object for RP authentication
   *
   * @function
   * @param signedWalletInstanceDPoP JWT of the Wallet Instance Attestation DPoP
   *
   * @returns The Request Object JWT
   *
   */
  async getRequestObject(
    signedWalletInstanceDPoP: string
  ): Promise<RequestObject> {
    const decodedJwtDPop = await decodeJwt(signedWalletInstanceDPoP);
    const requestUri = decodedJwtDPop.payload.htu as string;

    const response = await this.appFetch(requestUri, {
      method: "GET",
      headers: {
        Authorization: `DPoP ${this.walletInstanceAttestation}`,
        DPoP: signedWalletInstanceDPoP,
      },
    });

    if (response.status === 200) {
      let responseText = await response.text();
      let responseJwt = await decodeJwt(responseText);
      let requestObj = RequestObject.parse({
        header: responseJwt.protectedHeader,
        payload: responseJwt.payload,
      });
      return requestObj;
    }

    throw new IoWalletError(
      `Unable to obtain Request Object. Response code: ${response.status}`
    );
  }

  /**
   * Obtain the relying party entity configuration.
   */
  async getEntityConfiguration(): Promise<RpEntityConfiguration> {
    let wellKnownUrl = new URL(
      "/.well-known/openid-federation",
      this.relyingPartyBaseUrl
    ).href;

    const response = await this.appFetch(wellKnownUrl, {
      method: "GET",
    });

    if (response.status === 200) {
      let responseText = await response.text();
      let responseJwt = await decodeJwt(responseText);
      return RpEntityConfiguration.parse({
        header: responseJwt.protectedHeader,
        payload: responseJwt.payload,
      });
    }

    throw new IoWalletError(
      `Unable to obtain RP Entity Configuration. Response code: ${response.status}`
    );
  }
}
