import {
  sha256ToBase64,
  type CryptoContext,
  SignJWT,
  thumbprint,
} from "@pagopa/io-react-native-jwt";

import { JWK } from "../utils/jwk";
import uuid from "react-native-uuid";
import { ParError } from "../utils/errors";

import * as z from "zod";
import * as WalletInstanceAttestation from "../wallet-instance-attestation";

export type AuthorizationDetail = z.infer<typeof AuthorizationDetail>;
export const AuthorizationDetail = z.object({
  credential_definition: z.object({
    type: z.string(),
  }),
  format: z.literal("vc+sd-jwt"),
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
    walletProviderBaseUrl: string,
    parEndpoint: string,
    walletInstanceAttestation: string,
    authorizationDetails: AuthorizationDetails,
    assertionType: string
  ): Promise<string> => {
    // Calculate the thumbprint of the public key of the Wallet Instance Attestation.
    // The PAR request token is signed used the Wallet Instance Attestation key.
    // The signature can be verified by reading the public key from the key set shippet with the it will ship the Wallet Instance Attestation;
    //  key is matched by its kid, which is supposed to be the thumbprint of its public key.
    const keyThumbprint = await wiaCryptoContext
      .getPublicKey()
      .then(JWK.parse)
      .then(thumbprint);

    const parUrl = new URL(parEndpoint);
    const aud = `${parUrl.protocol}//${parUrl.hostname}`;

    const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
      .payload.cnf.jwk.kid;

    const codeChallenge = await sha256ToBase64(codeVerifier);

    const signedJwtForPar = await new SignJWT(wiaCryptoContext)
      .setProtectedHeader({
        kid: keyThumbprint,
      })
      .setPayload({
        iss,
        aud,
        jti: `${uuid.v4()}`,
        client_assertion_type: assertionType,
        authorization_details: authorizationDetails,
        response_type: "code",
        code_challenge_method: "s256",
        redirect_uri: walletProviderBaseUrl,
        state: `${uuid.v4()}`,
        client_id: clientId,
        code_challenge: codeChallenge,
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();

    const requestBody = {
      response_type: "code",
      client_id: clientId,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      client_assertion_type: assertionType,
      client_assertion: walletInstanceAttestation,
      request: signedJwtForPar,
    };

    var formBody = new URLSearchParams(requestBody);

    const response = await appFetch(parEndpoint, {
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

    throw new ParError(
      `Unable to obtain PAR. Response code: ${await response.text()}`
    );
  };
