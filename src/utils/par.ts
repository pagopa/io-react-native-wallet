import {
  sha256ToBase64,
  type CryptoContext,
  SignJWT,
} from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";
import * as WalletInstanceAttestation from "../wallet-instance-attestation";
import { generateRandomAlphaNumericString, hasStatusOrThrow } from "./misc";
import { createPopToken } from "./pop";
import { IssuerResponseError } from "./errors";
import { LogLevel, Logger } from "./logging";

export type AuthorizationDetail = z.infer<typeof AuthorizationDetail>;
export const AuthorizationDetail = z.object({
  type: z.literal("openid_credential"),
  credential_configuration_id: z.string(),
});

export type AuthorizationDetails = z.infer<typeof AuthorizationDetails>;
export const AuthorizationDetails = z.array(AuthorizationDetail);

export type ParResponse = z.infer<typeof ParResponse>;
export const ParResponse = z.object({
  request_uri: z.string(),
  expires_in: z.number(),
});

/**
 * Make a PAR request to the issuer and return the response url
 */
export const makeParRequest =
  ({
    wiaCryptoContext,
    appFetch,
  }: {
    wiaCryptoContext: CryptoContext;
    appFetch: GlobalFetch["fetch"];
  }) =>
  async (
    clientId: string,
    codeVerifier: string,
    redirectUri: string,
    responseMode: string,
    parEndpoint: string,
    walletInstanceAttestation: string,
    authorizationDetails: AuthorizationDetails
  ): Promise<string> => {
    const wiaPublicKey = await wiaCryptoContext.getPublicKey();

    const parUrl = new URL(parEndpoint);
    const aud = `${parUrl.protocol}//${parUrl.hostname}`;

    // TODO: is this the same as the client_id?
    const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
      .payload.cnf.jwk.kid;

    const signedWiaPoP = await createPopToken(
      {
        jti: `${uuidv4()}`,
        aud,
        iss,
      },
      wiaCryptoContext
    );

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
        typ: "jwt",
        kid: wiaPublicKey.kid,
      })
      .setPayload({
        jti: `${uuidv4()}`,
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
        // TODO: `scope` is not necessary if `authorization_details` is provided, so should we also support `scope`?
        // See https://italia.github.io/eid-wallet-it-docs/versione-corrente/en/pid-eaa-issuance.html#pushed-authorization-request-par-request
        // scope: "",
      })
      .setIssuedAt() // iat is set to now
      .setExpirationTime("5min")
      .sign();

    /** The request body for the Pushed Authorization Request */
    var formBody = new URLSearchParams({
      client_id: clientId,
      request: signedJwtForPar,
    });

    Logger.log(
      LogLevel.DEBUG,
      `Sending ${formBody} to PAR endpoint ${parEndpoint}`
    );

    return await appFetch(parEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "OAuth-Client-Attestation": walletInstanceAttestation,
        "OAuth-Client-Attestation-PoP": signedWiaPoP,
      },
      body: formBody.toString(),
    })
      .then(hasStatusOrThrow(201, IssuerResponseError))
      .then((res) => ParResponse.parse(res.json()))
      .then((result) => result.request_uri);
  };
