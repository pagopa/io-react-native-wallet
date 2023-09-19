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
import { getEntityConfiguration as getGenericEntityConfiguration } from "../trust";
import { createDPopToken } from "../utils/dpop";
import { WalletInstanceAttestation } from "..";

const getWalletInstanceAttestationSignKeyId = (
  walletInstanceAttestation: string
) => {
  return WalletInstanceAttestation.decode(walletInstanceAttestation).payload.cnf
    .jwk.kid;
};

const getWalletInstanceAttestationId = (walletInstanceAttestation: string) => {
  const {
    payload: { sub, iss },
  } = WalletInstanceAttestation.decode(walletInstanceAttestation);
  return new URL(`instance/${sub}`, iss).href;
};

/**
 * Select a RSA public key from those provided by the RP to encrypt.
 *
 * @param entity The RP entity configuration
 * @returns A suitable public key with its compatible encryption algorithm
 * @throws {NoSuitableKeysFoundInEntityConfiguration} If entity do not contain any public key suitable for encrypting
 */
const chooseRSAPublicKeyToEncrypt = (entity: RpEntityConfiguration): JWK => {
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
};

/**
 * Obtain the relying party entity configuration.
 */
export const getEntityConfiguration =
  ({ appFetch = fetch }: { appFetch?: GlobalFetch["fetch"] } = {}) =>
  async (relyingPartyBaseUrl: string): Promise<RpEntityConfiguration> => {
    return getGenericEntityConfiguration(relyingPartyBaseUrl, {
      appFetch: appFetch,
    }).then(RpEntityConfiguration.parse);
  };

/**
 * Decode a QR code content to an authentication request url.
 * @function
 * @param qrcode QR code content
 *
 * @returns The authentication request url
 *
 */
export const decodeAuthRequestQR = (qrcode: string): QRCodePayload => {
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
};

export type RequestObjectConf = {
  requestObject: RequestObject;
  walletInstanceAttestationSignKid: string;
  walletInstanceAttestationId: string;
  rpEntityConfiguration: RpEntityConfiguration;
};

/**
 * Obtain the Request Object for RP authentication
 * @see https://italia.github.io/eudi-wallet-it-docs/versione-corrente/en/relying-party-solution.html
 */
export const getRequestObject =
  ({
    wiaCryptoContext,
    appFetch = fetch,
  }: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }) =>
  async (
    walletInstanceAttestation: string,
    requestUri: string,
    rpEntityConfiguration: RpEntityConfiguration
  ): Promise<RequestObjectConf> => {
    const signedWalletInstanceDPoP = await createDPopToken(
      {
        jti: `${uuid.v4()}`,
        htm: "GET",
        htu: requestUri,
        ath: await sha256ToBase64(walletInstanceAttestation),
      },
      wiaCryptoContext
    );

    const response = await appFetch(requestUri, {
      method: "GET",
      headers: {
        Authorization: `DPoP ${walletInstanceAttestation}`,
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
        const pubKey =
          rpEntityConfiguration.payload.metadata.wallet_relying_party.jwks.find(
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
      const requestObject = RequestObject.parse({
        header: responseJwt.protectedHeader,
        payload: responseJwt.payload,
      });

      return {
        requestObject,
        walletInstanceAttestationId: getWalletInstanceAttestationId(
          walletInstanceAttestation
        ),
        walletInstanceAttestationSignKid: getWalletInstanceAttestationSignKeyId(
          walletInstanceAttestation
        ),
        rpEntityConfiguration,
      };
    }

    throw new IoWalletError(
      `Unable to obtain Request Object. Response code: ${response.status}
      ${await response.text()}`
    );
  };

/**
 * Prepare the Verified Presentation token for a received request object in the context of an authorization request flow.
 * The presentation is prepared by disclosing data from provided credentials, according to requested claims
 * Each Verified Credential come along with the claims the user accepts to disclose from it.
 *
 * @todo accept more than a Verified Credential
 */
const prepareVpToken =
  ({ wiaCryptoContext }: { wiaCryptoContext: CryptoContext }) =>
  async (
    {
      requestObject,
      walletInstanceAttestationId,
      walletInstanceAttestationSignKid,
    }: RequestObjectConf,
    [vc, claims]: Presentation // TODO: [SIW-353] support multiple presentations,
  ): Promise<{
    vp_token: string;
    presentation_submission: Record<string, unknown>;
  }> => {
    // this throws if vc cannot satisfy all the requested claims
    const { token: vp, paths } = await disclose(vc, claims);

    // TODO: [SIW-359] check all requeste claims of the requestedObj are satisfied

    const vp_token = await new SignJWT(wiaCryptoContext)
      .setProtectedHeader({
        typ: "JWT",
        kid: walletInstanceAttestationSignKid,
      })
      .setPayload({
        vp: vp,
        jti: `${uuid.v4()}`,
        iss: walletInstanceAttestationId,
        nonce: requestObject.payload.nonce,
      })
      .setAudience(requestObject.payload.response_uri)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();

    const vc_scope = requestObject.payload.scope;
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
  };

/**
 * Compose and send an Authorization Response in the context of an authorization request flow.
 *
 * @todo MUST add presentation_submission
 *
 */
export const sendAuthorizationResponse =
  ({
    wiaCryptoContext,
    appFetch = fetch,
  }: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }) =>
  async (
    {
      requestObject,
      walletInstanceAttestationId,
      walletInstanceAttestationSignKid,
      rpEntityConfiguration,
    }: RequestObjectConf,
    presentation: Presentation // TODO: [SIW-353] support multiple presentations,
  ): Promise<string> => {
    // the request is an unsigned jws without iss, aud, exp
    // https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-signed-and-encrypted-respon
    const jwk = chooseRSAPublicKeyToEncrypt(rpEntityConfiguration);

    const { vp_token, presentation_submission } = await prepareVpToken({
      wiaCryptoContext,
    })(
      {
        requestObject,
        walletInstanceAttestationId,
        walletInstanceAttestationSignKid,
        rpEntityConfiguration,
      },
      presentation
    );

    const authzResponsePayload = JSON.stringify({
      state: requestObject.payload.state,
      presentation_submission,
      nonce: requestObject.payload.nonce,
      vp_token,
    });

    const encrypted = await new EncryptJwe(authzResponsePayload, {
      alg: "RSA-OAEP-256",
      enc: "A256CBC-HS512",
      kid: jwk.kid,
    }).encrypt(jwk);

    const formBody = new URLSearchParams({ response: encrypted });
    const body = formBody.toString();

    const response = await appFetch(requestObject.payload.response_uri, {
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
  };
