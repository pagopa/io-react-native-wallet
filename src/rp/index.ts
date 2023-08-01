import {
  AuthRequestDecodeError,
  IoWalletError,
  NoSuitableKeysFoundInEntityConfiguration,
} from "../utils/errors";
import {
  decode as decodeJwt,
  decodeBase64,
  sha256ToBase64,
  SignJWT,
  EncryptJwe,
} from "@pagopa/io-react-native-jwt";
import {
  QRCodePayload,
  RequestObject,
  RpEntityConfiguration,
  type Presentation,
} from "./types";

import uuid from "react-native-uuid";
import type { JWK } from "@pagopa/io-react-native-jwt/lib/typescript/types";
import { disclose } from "../sd-jwt";

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
  static decodeAuthRequestQR(qrcode: string): QRCodePayload {
    const decoded = decodeBase64(qrcode);
    const decodedUrl = new URL(decoded);
    const protocol = decodedUrl.protocol;
    const resource = decodedUrl.hostname;
    const requestURI = decodedUrl.searchParams.get("request_uri");
    const clientId = decodedUrl.searchParams.get("client_id");

    const result = QRCodePayload.safeParse({
      protocol,
      resource,
      requestURI,
      clientId,
    });

    if (result.success) {
      return result.data;
    } else {
      throw new AuthRequestDecodeError(result.error.message, `${decodedUrl}`);
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
      const responseText = await response.text();
      const responseJwt = await decodeJwt(responseText);
      const requestObj = RequestObject.parse({
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
   * Prepare the Verified Presentation token for a received request object in the context of an authorization request flow.
   * The presentation is prepared by disclosing data from provided credentials, according to requested claims
   * Each Verified Credential come along with the claims the user accepts to disclose from it.
   *
   * The returned token is unsigned (sign should be apply by the caller).
   *
   * @todo accept more than a Verified Credential
   *
   * @param requestObj The incoming request object, which the requirements for the requested authorization
   * @param presentation The Verified Credential containing user data along with the list of claims to be disclosed.
   * @returns The unsigned Verified Presentation token
   * @throws {ClaimsNotFoundBetweenDislosures} If the Verified Credential does not contain one or more requested claims.
   *
   */
  prepareVpToken(
    requestObj: RequestObject,
    [vc, claims]: Presentation // TODO: [SIW-353] support multiple presentations
  ): string {
    // this throws if vc cannot satisfy all the requested claims
    const vp = disclose(vc, claims);

    // TODO: [SIW-359] check all requeste claims of the requestedObj are satisfied

    const vp_token = new SignJWT({ vp })
      .setAudience(requestObj.payload.response_uri)
      .setExpirationTime("1h")
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
      })
      .toSign();

    return vp_token;
  }

  /**
   * Compose and send an Authorization Response in the context of an authorization request flow.
   *
   * @todo MUST add presentation_submission
   *
   * @param requestObj The incoming request object, which the requirements for the requested authorization
   * @param vp_token The signed Verified Presentation token with data to send.
   * @param entity The RP entity configuration
   * @returns The response from the RP
   * @throws {IoWalletError} if the submission fails.
   * @throws {NoSuitableKeysFoundInEntityConfiguration} If entity do not contain any public key
   *
   */
  async sendAuthorizationResponse(
    requestObj: RequestObject,
    vp_token: string,
    entity: RpEntityConfiguration
  ): Promise<string> {
    // the request is an unsigned jws without iss, aud, exp
    // https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-signed-and-encrypted-respon
    const jwk = this.choosePublicKeyToEncrypt(entity);

    const authzResponsePayload = JSON.stringify({
      state: requestObj.payload.state,
      // TODO: [SIW-352] MUST add presentation_submission
      // presentation_submission:
      vp_token,
    });
    const encrypted = await new EncryptJwe(authzResponsePayload, {
      alg: jwk.alg,
      enc: "A256CBC-HS512",
    }).encrypt(jwk);

    const formBody = new URLSearchParams({ response: encrypted });
    const response = await this.appFetch(requestObj.payload.response_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    if (response.status === 200) {
      return response.text();
    }

    throw new IoWalletError(
      `Unable to send Authorization Response. Response code: ${response.status}`
    );
  }

  /**
   * Select a public key from those provided by the RP
   *
   * @param entity The RP entity configuration
   * @returns a
   * @throws {NoSuitableKeysFoundInEntityConfiguration} If entity do not contain any public key suitable for encrypting
   */
  private choosePublicKeyToEncrypt(
    entity: RpEntityConfiguration
  ): JWK & { alg: "RSA-OAEP-256" | "RSA-OAEP" } {
    const supportedAlgos = ["RSA-OAEP-256", "RSA-OAEP"];
    const [randomKey] = entity.payload.jwks.keys
      // keys must have declared alg and must be a supperted algorithm
      .filter(
        <T>(
          k: T & { alg?: string }
        ): k is T & { alg: "RSA-OAEP-256" | "RSA-OAEP" } =>
          typeof k.alg === "string" && supportedAlgos.includes(k.alg)
      )
      // shuffle elements to select a random key
      .sort((_a, _b) => (Math.random() > 0.5 ? 1 : -1));
    if (!randomKey) {
      throw new NoSuitableKeysFoundInEntityConfiguration(
        "Encrypt with RP public key"
      );
    }

    return randomKey;
  }

  /**
   * Obtain the relying party entity configuration.
   */
  async getEntityConfiguration(): Promise<RpEntityConfiguration> {
    const wellKnownUrl = new URL(
      "/.well-known/openid-federation",
      this.relyingPartyBaseUrl
    ).href;

    const response = await this.appFetch(wellKnownUrl, {
      method: "GET",
    });

    if (response.status === 200) {
      const responseText = await response.text();
      const responseJwt = await decodeJwt(responseText);
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
