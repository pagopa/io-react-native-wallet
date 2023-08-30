import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { verify as verifyJwt } from "@pagopa/io-react-native-jwt";
import { SignJWT, thumbprint } from "@pagopa/io-react-native-jwt";
import { JWK } from "../utils/jwk";
import { WalletInstanceAttestationRequestJwt } from "./types";
import uuid from "react-native-uuid";
import { WalletInstanceAttestationIssuingError } from "../utils/errors";

function removePadding(encoded: string): string {
  // eslint-disable-next-line no-div-regex
  return encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fixKey(k: ReturnType<typeof JWK.parse>): ReturnType<typeof JWK.parse> {
  const { x, y, e, n, ...pk } = k;
  return {
    ...pk,
    ...(x ? { x: removePadding(x) } : {}),
    ...(y ? { y: removePadding(y) } : {}),
    ...(e ? { e: removePadding(e) } : {}),
    ...(n ? { n: removePadding(n) } : {}),
  };
}

export class Issuing {
  walletProviderBaseUrl: string;
  appFetch: GlobalFetch["fetch"];
  constructor(
    walletProviderBaseUrl: string,
    appFetch: GlobalFetch["fetch"] = fetch
  ) {
    this.walletProviderBaseUrl = walletProviderBaseUrl;
    this.appFetch = appFetch;
  }

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
  async getAttestationRequestToSign(jwk: JWK): Promise<string> {
    const parsedJwk = JWK.parse(jwk);
    const keyThumbprint = await thumbprint(parsedJwk);
    const publicKey = { ...parsedJwk, kid: keyThumbprint };

    const walletInstanceAttestationRequest = new SignJWT({
      iss: keyThumbprint,
      sub: this.walletProviderBaseUrl,
      jti: `${uuid.v4()}`,
      type: "WalletInstanceAttestationRequest",
      cnf: {
        jwk: fixKey(publicKey),
      },
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: publicKey.kid,
        typ: "var+jwt",
      })
      .setIssuedAt()
      .setExpirationTime("100d")
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
   *
   * @returns {string} Wallet Instance Attestation
   *
   */
  async getAttestation(
    attestationRequest: string,
    signature: string
  ): Promise<string> {
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

    const tokenUrl = new URL("token", this.walletProviderBaseUrl).href;
    const requestBody = {
      grant_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-key-attestation",
      assertion: signedAttestationRequest,
    };
    const response = await this.appFetch(tokenUrl, {
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
}
