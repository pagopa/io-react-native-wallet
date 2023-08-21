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
    walletInstanceAttestationJwk: any,
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
   * @see https://italia.github.io/eudi-wallet-it-docs/versione-corrente/en/relying-party-solution.html
   *
   * @async @function
   * @param signedWalletInstanceDPoP JWT of the Wallet Instance Attestation DPoP
   *
   * @returns The Request Object JWT
   * @throws {NoSuitableKeysFoundInEntityConfiguration} When the Request Object is signed with a key not listed in RP's entity configuration
   *
   */
  async getRequestObject(
    signedWalletInstanceDPoP: string,
    requestUri: string,
    entity: RpEntityConfiguration
  ): Promise<RequestObject> {
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
   * The returned token is unsigned (sign should be apply by the caller).
   *
   * @todo accept more than a Verified Credential
   *
   * @param requestObj The incoming request object, which the requirements for the requested authorization
   * @param walletInstanceIdentifier The identifies of the wallt instance that is presenting
   * @param presentation The Verified Credential containing user data along with the list of claims to be disclosed.
   * @returns The unsigned Verified Presentation token
   * @throws {ClaimsNotFoundBetweenDislosures} If the Verified Credential does not contain one or more requested claims.
   *
   */
  async prepareVpToken(
    requestObj: RequestObject,
    walletInstanceIdentifier: string,
    [vc, claims]: Presentation // TODO: [SIW-353] support multiple presentations
  ): Promise<{
    vp_token: string;
    presentation_submission: Record<string, unknown>;
  }> {
    // this throws if vc cannot satisfy all the requested claims
    const { token: vp, paths } = await disclose(vc, claims);

    // TODO: [SIW-359] check all requeste claims of the requestedObj are satisfied

    const vp_token = new SignJWT({
      vp: vp,
      jti: `${uuid.v4()}`,
      iss: walletInstanceIdentifier,
      nonce: requestObj.payload.nonce,
    })
      .setAudience(requestObj.payload.response_uri)
      .setIssuedAt()
      .setExpirationTime("1h")
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: "",
      })
      .toSign();

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
   * @param vp_token The signed Verified Presentation token with data to send.
   * @param presentation_submission
   * @param entity The RP entity configuration
   * @returns The response from the RP
   * @throws {IoWalletError} if the submission fails.
   * @throws {NoSuitableKeysFoundInEntityConfiguration} If entity do not contain any public key
   *
   */
  async sendAuthorizationResponse(
    requestObj: RequestObject,
    vp_token: string,
    presentation_submission: Record<string, unknown>,
    entity: RpEntityConfiguration
  ): Promise<string> {
    // the request is an unsigned jws without iss, aud, exp
    // https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-signed-and-encrypted-respon
    const jwk = this.chooseRSAPublicKeyToEncrypt(entity);

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
      return await response.text();
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
    const wellKnownUrl =
      this.relyingPartyBaseUrl + "/.well-known/openid-federation";

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
