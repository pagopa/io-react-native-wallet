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
  verify,
  type CryptoContext,
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
import { getEntityConfiguration } from "../trust";
import { createDPopToken } from "../utils/dpop";
import { WalletInstanceAttestation } from "..";

export class RelyingPartySolution {
  relyingPartyBaseUrl: string;
  walletInstanceAttestation: string;
  wiaCryptoContext: CryptoContext;
  appFetch: GlobalFetch["fetch"];

  constructor(
    relyingPartyBaseUrl: string,
    walletInstanceAttestation: string,
    wiaCryptoContext: CryptoContext,
    appFetch: GlobalFetch["fetch"] = fetch
  ) {
    this.relyingPartyBaseUrl = relyingPartyBaseUrl;
    this.walletInstanceAttestation = walletInstanceAttestation;
    this.wiaCryptoContext = wiaCryptoContext;
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
   * Obtain the signed wallet instance DPoP for authentication request
   *
   * @function
   * @param authRequestUrl authentication request url
   *
   * @returns The signed wallet instance DPoP
   *
   */
  private async getWalletInstanceDPoP(authRequestUrl: string): Promise<string> {
    return createDPopToken(
      {
        jti: `${uuid.v4()}`,
        htm: "GET",
        htu: authRequestUrl,
        ath: await sha256ToBase64(this.walletInstanceAttestation),
      },
      this.wiaCryptoContext
    );
  }

  private get walletInstanceAttestationSignKeyId() {
    return WalletInstanceAttestation.decode(this.walletInstanceAttestation)
      .payload.cnf.jwk.kid;
  }

  private get walletInstanceAttestationId() {
    const {
      payload: { sub, iss },
    } = WalletInstanceAttestation.decode(this.walletInstanceAttestation);
    return new URL(`instance/${sub}`, iss).href;
  }

  /**
   * Obtain the Request Object for RP authentication
   * @see https://italia.github.io/eudi-wallet-it-docs/versione-corrente/en/relying-party-solution.html
   *
   * @async @function
   * @param requestUri presentation request url
   *
   * @returns The Request Object JWT
   * @throws {NoSuitableKeysFoundInEntityConfiguration} When the Request Object is signed with a key not listed in RP's entity configuration
   *
   */
  async getRequestObject(
    requestUri: string,
    entity: RpEntityConfiguration
  ): Promise<RequestObject> {
    const signedWalletInstanceDPoP = await this.getWalletInstanceDPoP(
      requestUri
    );
    const response = await this.appFetch(requestUri, {
      method: "GET",
      headers: {
        Authorization: `DPoP ${this.walletInstanceAttestation}`,
        DPoP: signedWalletInstanceDPoP,
      },
    });

    if (response.status === 200) {
      const responseJson = await response.json();
      const responseEncodedJwt = responseJson.response;

      const responseJwt = decodeJwt(responseEncodedJwt);

      // verify token signature according to RP's entity configuration
      // to ensure the request object is authentic
      {
        const pubKey = entity.payload.metadata.wallet_relying_party.jwks.find(
          ({ kid }) => kid === responseJwt.protectedHeader.kid
        );
        if (!pubKey) {
          throw new NoSuitableKeysFoundInEntityConfiguration(
            "Request Object signature verification"
          );
        }
        await verify(responseEncodedJwt, pubKey);
      }

      // parse request object it has the expected shape by specification
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
   * @todo accept more than a Verified Credential
   *
   * @param requestObj The incoming request object, which the requirements for the requested authorization
   * @param presentation The Verified Credential containing user data along with the list of claims to be disclosed.
   * @returns The Verified Presentation token along with the presentation submission metadata
   * @throws {ClaimsNotFoundBetweenDislosures} If the Verified Credential does not contain one or more requested claims.
   *
   */
  private async prepareVpToken(
    requestObj: RequestObject,
    [vc, claims]: Presentation // TODO: [SIW-353] support multiple presentations,
  ): Promise<{
    vp_token: string;
    presentation_submission: Record<string, unknown>;
  }> {
    // this throws if vc cannot satisfy all the requested claims
    const { token: vp, paths } = await disclose(vc, claims);

    // TODO: [SIW-359] check all requeste claims of the requestedObj are satisfied

    const vp_token = await new SignJWT(this.wiaCryptoContext)
      .setProtectedHeader({
        typ: "JWT",
        kid: this.walletInstanceAttestationSignKeyId,
      })
      .setPayload({
        vp: vp,
        jti: `${uuid.v4()}`,
        iss: this.walletInstanceAttestationId,
        nonce: requestObj.payload.nonce,
      })
      .setAudience(requestObj.payload.response_uri)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();

    const vc_scope = requestObj.payload.scope;
    const presentation_submission = {
      definition_id: `${uuid.v4()}`,
      id: `${uuid.v4()}`,
      descriptor_map: paths.map((p) => ({
        id: vc_scope,
        path: `$.vp_token.${p.path}`,
        format: "vc+sd-jwt",
      })),
    };

    return { vp_token, presentation_submission };
  }

  /**
   * Compose and send an Authorization Response in the context of an authorization request flow.
   *
   * @todo MUST add presentation_submission
   *
   * @param requestObj The incoming request object, which the requirements for the requested authorization
   * @param presentation The Verified Credential containing user data along with the list of claims to be disclosed.
   * @param entity The RP entity configuration
   * @returns The response from the RP
   * @throws {IoWalletError} if the submission fails.
   * @throws {NoSuitableKeysFoundInEntityConfiguration} If entity do not contain any public key
   *
   */
  async sendAuthorizationResponse(
    requestObj: RequestObject,
    presentation: Presentation, // TODO: [SIW-353] support multiple presentations,
    entity: RpEntityConfiguration
  ): Promise<string> {
    // the request is an unsigned jws without iss, aud, exp
    // https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-signed-and-encrypted-respon
    const jwk = this.chooseRSAPublicKeyToEncrypt(entity);

    const { vp_token, presentation_submission } = await this.prepareVpToken(
      requestObj,
      presentation
    );

    const authzResponsePayload = JSON.stringify({
      state: requestObj.payload.state,
      presentation_submission,
      nonce: requestObj.payload.nonce,
      vp_token,
    });

    const encrypted = await new EncryptJwe(authzResponsePayload, {
      alg: "RSA-OAEP-256",
      enc: "A256CBC-HS512",
      kid: jwk.kid,
    }).encrypt(jwk);

    const formBody = new URLSearchParams({ response: encrypted });
    const body = formBody.toString();

    const response = await this.appFetch(requestObj.payload.response_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (response.status === 200) {
      return await response.json();
    }

    throw new IoWalletError(
      `Unable to send Authorization Response. Response: ${await response.text()} with code: ${
        response.status
      }`
    );
  }

  /**
   * Select a RSA public key from those provided by the RP to encrypt.
   *
   * @param entity The RP entity configuration
   * @returns A suitable public key with its compatible encryption algorithm
   * @throws {NoSuitableKeysFoundInEntityConfiguration} If entity do not contain any public key suitable for encrypting
   */
  private chooseRSAPublicKeyToEncrypt(entity: RpEntityConfiguration): JWK {
    const [usingRsa256] =
      entity.payload.metadata.wallet_relying_party.jwks.filter(
        (jwk) => jwk.use === "enc" && jwk.kty === "RSA"
      );

    if (usingRsa256) {
      return usingRsa256;
    }

    // No suitable key has been found
    throw new NoSuitableKeysFoundInEntityConfiguration(
      "Encrypt with RP public key"
    );
  }

  /**
   * Obtain the relying party entity configuration.
   */
  async getEntityConfiguration(): Promise<RpEntityConfiguration> {
    return getEntityConfiguration(this.relyingPartyBaseUrl, {
      appFetch: this.appFetch,
    }).then(RpEntityConfiguration.parse);
  }
}
