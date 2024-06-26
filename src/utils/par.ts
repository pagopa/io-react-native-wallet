import {
  sha256ToBase64,
  type CryptoContext,
  SignJWT,
} from "@pagopa/io-react-native-jwt";
import uuid from "react-native-uuid";
import * as z from "zod";
import * as WalletInstanceAttestation from "../wallet-instance-attestation";
import { generateRandomAlphaNumericString, hasStatus } from "./misc";

export type AuthorizationDetail = z.infer<typeof AuthorizationDetail>;
export const AuthorizationDetail = z.object({
  credential_configuration_id: z.string(),
  format: z.union([z.literal("vc+sd-jwt"), z.literal("vc+mdoc-cbor")]),
  type: z.literal("openid_credential"),
});

export type AuthorizationDetails = z.infer<typeof AuthorizationDetails>;
export const AuthorizationDetails = z.array(AuthorizationDetail);

/**
 * Make a PAR request to the issuer and return the response url
 */
export const makeParRequest =
  ({
    wiaCryptoContext,
    appFetch = fetch,
  }: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }) =>
  async (
    clientId: string,
    codeVerifier: string,
    redirectUri: string,
    responseMode: string,
    parEndpoint: string,
    walletInstanceAttestation: string,
    signedWiaPoP: string,
    authorizationDetails: AuthorizationDetails,
    assertionType: string
  ): Promise<string> => {
    const wiaPublicKey = await wiaCryptoContext.getPublicKey();

    const parUrl = new URL(parEndpoint);
    const aud = `${parUrl.protocol}//${parUrl.hostname}`;

    const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
      .payload.cnf.jwk.kid;

    /** A code challenge is provided so that the PAR is bound
        to the subsequent authorization code request
        @see https://datatracker.ietf.org/doc/html/rfc9126#name-request */
    const codeChallengeMethod = "S256";
    const codeChallenge = await sha256ToBase64(codeVerifier);

    /** The PAR request token is signed used the Wallet Instance Attestation key.
        The signature can be verified by reading the public key from the key set shippet
        with the it will ship the Wallet Instance Attestation.
        The key is matched by its kid */
    const signedJwtForPar = await new SignJWT(wiaCryptoContext)
      .setProtectedHeader({
        typ: "jwk",
        kid: wiaPublicKey.kid,
      })
      .setPayload({
        jti: `${uuid.v4()}`,
        aud,
        response_type: "code",
        response_mode: responseMode,
        client_id: clientId,
        iss,
        state: generateRandomAlphaNumericString(32),
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        authorization_details: authorizationDetails,
        redirect_uri: redirectUri,
        client_assertion_type: assertionType,
        client_assertion: walletInstanceAttestation + "~" + signedWiaPoP,
      })
      .setIssuedAt() //iat is set to now
      .setExpirationTime("1h")
      .sign();

    /** The request body for the Pushed Authorization Request */
    var formBody = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      request: signedJwtForPar,
      client_assertion_type: assertionType,
      client_assertion: walletInstanceAttestation + "~" + signedWiaPoP,
    });

    return await appFetch(parEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    })
      .then(hasStatus(201))
      .then((res) => res.json())
      .then((result) => result.request_uri);
  };
