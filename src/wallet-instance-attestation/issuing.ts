import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { verify as verifyJwt } from "@pagopa/io-react-native-jwt";
import { SignJWT, thumbprint } from "@pagopa/io-react-native-jwt";
import { WALLET_PROVIDER_BASE_URL } from "..";
import { JWK } from "../utils/jwk";
import { WalletInstanceAttestationRequestJwt } from "./types";
import uuid from "react-native-uuid";
import { WalletInstanceAttestationIssuingError } from "../utils/errors";

/**
 * Get the Wallet Instance Attestation Request to sign
 *
 * @async @function
 *
 * @param jwk Public key of the wallet instance
 *
 * @returns {string} Wallet Instance Attestation Request to sign
 *
 */
export async function getAttestationRequestToSign(jwk: JWK): Promise<string> {
  const parsedJwk = JWK.parse(jwk);
  const keyThumbprint = await thumbprint(parsedJwk);
  const publicKey = { ...parsedJwk, kid: keyThumbprint };

  const walletInstanceAttestationRequest = new SignJWT({
    iss: keyThumbprint,
    sub: WALLET_PROVIDER_BASE_URL,
    jti: `${uuid.v4()}`,
    type: "WalletInstanceAttestationRequest",
    cnf: {
      jwk: publicKey,
    },
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicKey.kid,
      typ: "var+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .toSign();

  return walletInstanceAttestationRequest;
}

/**
 * Get the Wallet Instance Attestation given a
 * Wallet Instance Attestation Request and signature
 *
 * @async @function
 *
 * @param attestationRequest Wallet Instance Attestaion Request
 * obtained with {@link getAttestationRequestToSign}
 * @param signature Signature of the Wallet Instance Attestaion Request
 * @param appFetch Optional object with fetch function to use
 *
 * @returns {string} Wallet Instance Attestation
 *
 */
export async function getAttestation(
  attestationRequest: string,
  signature: string,
  appFetch: GlobalFetch = { fetch }
): Promise<String> {
  const signedAttestationRequest = await SignJWT.appendSignature(
    attestationRequest,
    signature
  );
  const decodedRequest = decodeJwt(signedAttestationRequest);
  const parsedRequest = WalletInstanceAttestationRequestJwt.parse({
    payload: decodedRequest.payload,
    header: decodedRequest.protectedHeader,
  });
  const publicKey = parsedRequest.payload.cnf.jwk;

  await verifyJwt(signedAttestationRequest, publicKey);

  const tokenUrl = new URL("token", WALLET_PROVIDER_BASE_URL).href;
  const requestBody = {
    grant_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-key-attestation",
    assertion: signedAttestationRequest,
  };
  const response = await appFetch.fetch(tokenUrl, {
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
