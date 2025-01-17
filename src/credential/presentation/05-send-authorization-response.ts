import { EncryptJwe, SignJWT } from "@pagopa/io-react-native-jwt";
import uuid from "react-native-uuid";
import * as WalletInstanceAttestation from "../../wallet-instance-attestation";
import type { JWK } from "@pagopa/io-react-native-jwt/lib/typescript/types";
import { NoSuitableKeysFoundInEntityConfiguration } from "./errors";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { GetRequestObject } from "./04-get-request-object";
import { disclose } from "../../sd-jwt";
import type { EvaluateRelyingPartyTrust } from "./02-evaluate-rp-trust";
import { type Presentation } from "./types";
import * as z from "zod";

export type AuthorizationResponse = z.infer<typeof AuthorizationResponse>;
export const AuthorizationResponse = z.object({
  status: z.string(),
  response_code: z
    .string() /**
      FIXME: [SIW-627] we expect this value from every RP implementation
      Actually some RP does not return the value
      We make it optional to not break the flow.
    */
    .optional(),
});

/**
 * Choose an RSA public key from those offered by the RP for encryption.
 *
 * @param entity The RP entity configuration
 * @returns A suitable public key with its compatible encryption algorithm
 * @throws {NoSuitableKeysFoundInEntityConfiguration} If entity do not contain any public key suitable for encrypting
 */
const chooseRSAPublicKeyToEncrypt = (
  entity: Out<EvaluateRelyingPartyTrust>["rpConf"]
): JWK => {
  const [usingRsa256] = entity.wallet_relying_party.jwks.keys.filter(
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
 * Generate a Verified Presentation token for a received request object within the context of an authorization request flow.
 * The presentation is created by revealing data from the provided credentials based on the requested claims.
 * Each Verified Credential is accompanied by the claims that the user consents to disclose from it.
 *
 * @todo: Allow for handling more than one Verified Credential.
 */
const prepareVpToken = async (
  requestObject: Out<GetRequestObject>["requestObject"],
  walletInstanceAttestation: string,
  [vc, claims, cryptoCtx]: Presentation // TODO: [SIW-353] support multiple presentations,
): Promise<{
  vp_token: string;
  presentation_submission: Record<string, unknown>;
}> => {
  // this throws if vc cannot satisfy all the requested claims
  const { token: vp, paths } = await disclose(vc, claims);

  // obtain issuer from Wallet Instance
  const {
    payload: { iss },
  } = WalletInstanceAttestation.decode(walletInstanceAttestation);

  const pidKid = await cryptoCtx.getPublicKey().then((_) => _.kid);

  // TODO: [SIW-359] check all requeste claims of the requestedObj are satisfied
  const vp_token = await new SignJWT(cryptoCtx)
    .setProtectedHeader({
      typ: "JWT",
      kid: pidKid,
    })
    .setPayload({
      vp: vp,
      jti: `${uuid.v4()}`,
      iss,
      nonce: requestObject.nonce,
    })
    .setAudience(requestObject.response_uri)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();

  const vc_scope = requestObject.scope;
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

export type SendAuthorizationResponse = (
  requestObject: Out<GetRequestObject>["requestObject"],
  rpConf: Out<EvaluateRelyingPartyTrust>["rpConf"],
  presentation: Presentation, // TODO: [SIW-353] support multiple presentations
  context: {
    walletInstanceAttestation: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<AuthorizationResponse>;

/**
 * Complete the presentation flow by sending the authorization response to the Relying Party
 *
 * @param requestObject The Request Object that describes the presentation
 * @param rpConf The Relying Party's configuration
 * @param presentation The presentation tuple consisting in the signed credential,
 * the list of claims to be disclosed, and the context to access the key that proves the holder binding
 * @param context.walletInstanceAttestation The Wallet Instance Attestation token
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The result of the presentation flow
 */
export const sendAuthorizationResponse: SendAuthorizationResponse = async (
  requestObject,
  rpConf,
  presentation,
  { appFetch = fetch, walletInstanceAttestation }
): Promise<AuthorizationResponse> => {
  // the request is an unsigned jws without iss, aud, exp
  // https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-signed-and-encrypted-respon
  const rsaPublicJwk = chooseRSAPublicKeyToEncrypt(rpConf);

  const { vp_token, presentation_submission } = await prepareVpToken(
    requestObject,
    walletInstanceAttestation,
    presentation
  );

  const authzResponsePayload = JSON.stringify({
    state: requestObject.state,
    presentation_submission,
    nonce: requestObject.nonce,
    vp_token,
  });

  const encrypted = await new EncryptJwe(authzResponsePayload, {
    alg: "RSA-OAEP-256",
    enc: "A256CBC-HS512",
    kid: rsaPublicJwk.kid,
  }).encrypt(rsaPublicJwk);

  const formBody = new URLSearchParams({ response: encrypted });
  const body = formBody.toString();

  return appFetch(requestObject.response_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then(AuthorizationResponse.parse);
};
