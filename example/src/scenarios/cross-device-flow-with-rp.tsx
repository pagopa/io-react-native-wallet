import { sign, getPublicKey, generate } from "@pagopa/io-react-native-crypto";
import { RelyingPartySolution } from "@pagopa/io-react-native-wallet";
import { WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { SignJWT } from "@pagopa/io-react-native-jwt";

// eudiw://authorize?client_id=https://verifier.example.org&request_uri=https://verifier.example.org/request_uri
const QR =
  "ZXVkaXc6Ly9hdXRob3JpemU/Y2xpZW50X2lkPWh0dHBzOi8vdmVyaWZpZXIuZXhhbXBsZS5vcmcmcmVxdWVzdF91cmk9aHR0cHM6Ly92ZXJpZmllci5leGFtcGxlLm9yZy9yZXF1ZXN0X3VyaQ==";

async function getAttestation(): Promise<{
  attestation: string;
  keytag: string;
}> {
  const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
  // generate Key for Wallet Instance Attestation
  const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);
  const walletInstancePublicKey = await generate(walletInstanceKeyTag);
  const issuingAttestation = new WalletInstanceAttestation.Issuing(
    walletProviderBaseUrl
  );

  const attestationRequest =
    await issuingAttestation.getAttestationRequestToSign(
      walletInstancePublicKey
    );
  const signature = await sign(attestationRequest, walletInstanceKeyTag);

  // generate a fresh Wallet Instance Attestation
  const instanceAttestation = (await issuingAttestation.getAttestation(
    attestationRequest,
    signature
  )) as string;

  return {
    attestation: instanceAttestation,
    keytag: walletInstanceKeyTag,
  };
}

export default async () => {
  try {
    // obtain new attestation
    const WIA = await getAttestation();

    // Scan/Decode QR
    const { requestURI: authRequestUrl } =
      RelyingPartySolution.decodeAuthRequestQR(QR);
    //const authRequestUrl = "https://verifier.example.org/request_uri";

    // instantiate
    const RP = new RelyingPartySolution(authRequestUrl, WIA.attestation);

    // Create unsigned dpop
    const unsignedDPoP = await RP.getUnsignedWalletInstanceDPoP(
      await getPublicKey(WIA.keytag),
      authRequestUrl
    );

    // get signature for dpop
    const DPoPSignature = await sign(unsignedDPoP, WIA.keytag);

    // get request object
    const requestObj = await SignJWT.appendSignature(
      unsignedDPoP,
      DPoPSignature
    ).then((t) => RP.getRequestObject(t));

    // Attest Relying Party trust
    // TODO

    // Validate Request object signature
    // TODO

    // Submit authorization response
    // TODO

    return result(requestObj);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
