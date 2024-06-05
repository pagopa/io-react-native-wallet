import { type CryptoContext } from "@pagopa/io-react-native-jwt";
import { SignJWT, thumbprint } from "@pagopa/io-react-native-jwt";
import { JWK, fixBase64EncodingOnKey } from "../utils/jwk";
import { getWalletProviderClient } from "../client";
import type { IntegrityContext } from "..";
import { z } from "zod";

export async function getAttestationRequest(
  challenge: string,
  wiaCryptoContext: CryptoContext,
  integrityContext: IntegrityContext,
  walletProviderBaseUrl: string
): Promise<string> {
  const jwk = await wiaCryptoContext.getPublicKey();
  const parsedJwk = JWK.parse(jwk);
  const keyThumbprint = await thumbprint(parsedJwk);
  const publicKey = { ...parsedJwk, kid: keyThumbprint };

  const clientData = {
    challenge,
    jwk_thumbprint: keyThumbprint,
  };

  const hardwareKeyTag = integrityContext.getHardwareKeyTag();
  const { signature, authenticatorData } =
    await integrityContext.getHardwareSignatureWithAuthData(
      JSON.stringify(clientData)
    );

  return new SignJWT(wiaCryptoContext)
    .setPayload({
      iss: keyThumbprint,
      sub: walletProviderBaseUrl,
      challenge,
      hardware_signature: signature,
      integrity_assertion: authenticatorData,
      hardware_key_tag: hardwareKeyTag,
      cnf: {
        jwk: fixBase64EncodingOnKey(publicKey),
      },
    })
    .setProtectedHeader({
      kid: publicKey.kid,
      typ: "war+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();
}

/**
 * Request a Wallet Instance Attestation (WIA) to the Wallet provider
 *
 * @param params.wiaCryptoContext The key pair associated with the WIA. Will be use to prove the ownership of the attestation.
 * @param params.appFetch (optional) Http client
 * @param walletProviderBaseUrl Base url for the Wallet Provider
 * @returns The retrieved Wallet Instance Attestation token
 */
export const getAttestation = async ({
  wiaCryptoContext,
  integrityContext,
  walletProviderBaseUrl,
  appFetch = fetch,
}: {
  wiaCryptoContext: CryptoContext;
  integrityContext: IntegrityContext;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}): Promise<string> => {
  const api = getWalletProviderClient({
    walletProviderBaseUrl,
    appFetch,
  });

  // 1. Get nonce from backend
  const challenge = await api.get("/nonce").then((response) => response.nonce);

  const signedAttestationRequest = await getAttestationRequest(
    challenge,
    wiaCryptoContext,
    integrityContext,
    walletProviderBaseUrl
  );

  /*
    const decodedRequest = decodeJwt(signedAttestationRequest);
    const parsedRequest = WalletInstanceAttestationRequestJwt.parse({
      payload: decodedRequest.payload,
      header: decodedRequest.protectedHeader,
    });
    const publicKey = parsedRequest.payload.cnf.jwk;

    await verifyJwt(signedAttestationRequest, publicKey);
    */

  const wia = await api
    .post("/token", {
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signedAttestationRequest,
      },
    })
    .then((result) => z.string().parse(result));

  return wia;
};
