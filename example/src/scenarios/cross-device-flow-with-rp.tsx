import { sign, generate, getPublicKey } from "@pagopa/io-react-native-crypto";
import { RelyingPartySolution } from "@pagopa/io-react-native-wallet";
import {
  WalletInstanceAttestation,
  getEntityConfiguration,
  verifyTrustChain,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { SignJWT } from "@pagopa/io-react-native-jwt";
import getPid from "./get-pid";

const QR =
  "aHR0cHM6Ly9kZW1vLnByb3h5LmV1ZGkud2FsbGV0LmRldmVsb3BlcnMuaXRhbGlhLml0L09wZW5JRDRWUD9jbGllbnRfaWQ9aHR0cHMlM0ElMkYlMkZkZW1vLnByb3h5LmV1ZGkud2FsbGV0LmRldmVsb3BlcnMuaXRhbGlhLml0JTJGT3BlbklENFZQJnJlcXVlc3RfdXJpPWh0dHBzJTNBJTJGJTJGZGVtby5wcm94eS5ldWRpLndhbGxldC5kZXZlbG9wZXJzLml0YWxpYS5pdCUyRk9wZW5JRDRWUCUyRnJlcXVlc3QtdXJpJTNGaWQlM0RkZDA3NzBhMC05ZTM1LTQ3OTUtYjZlYi03MDlkZDg1ZDM1ODM=";

const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);

const trustAnchorBaseUrl =
  "https://demo.federation.eudi.wallet.developers.italia.it/";

async function getAttestation(): Promise<{
  attestation: string;
  keytag: string;
}> {
  const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
  // generate Key for Wallet Instance Attestation
  const walletInstancePublicKey = await getPublicKey(
    walletInstanceKeyTag
  ).catch((_) => generate(walletInstanceKeyTag));

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
    // trust anchor entity could be already fetched at application start
    const trustAnchorEntity = await getEntityConfiguration(trustAnchorBaseUrl);

    // obtain new attestation
    const WIA = await getAttestation();

    // obtain PID
    const [, pidToken] = await getPid();
    if (!pidToken) {
      return error("pidToken cannot be empty");
    }

    // Scan/Decode QR
    const { requestURI: authRequestUrl, clientId } =
      RelyingPartySolution.decodeAuthRequestQR(QR);

    // instantiate
    const RP = new RelyingPartySolution(clientId, WIA.attestation);
    const decodedWIA = WalletInstanceAttestation.decode(WIA.attestation);

    // Create unsigned dpop
    const unsignedDPoP = await RP.getUnsignedWalletInstanceDPoP(
      decodedWIA.payload.cnf.jwk,
      authRequestUrl
    );

    // get signature for dpop
    const DPoPSignature = await sign(unsignedDPoP, WIA.keytag);

    // resolve RP's entity configuration
    const entity = await RP.getEntityConfiguration();

    // get request object
    const requestObj = await SignJWT.appendSignature(
      unsignedDPoP,
      DPoPSignature
    ).then((t) => RP.getRequestObject(t, authRequestUrl, entity));

    // Attest Relying Party trust
    await verifyTrustChain(trustAnchorEntity, requestObj.header.trust_chain);

    // select claims to be disclose from pid
    // these would be selected by users in the UI
    const claims = [
      "unique_id",
      "given_name",
      "family_name",
      "birthdate",
      "place_of_birth",
      "tax_id_number",
      "evidence",
    ];

    const walletInstanceId = `${decodedWIA.payload.iss}/instance/${decodedWIA.payload.sub}`;

    // verified presentation is signed using the same key of the wallet attestation
    const { vp_token: unsignedVpToken, presentation_submission } =
      await RP.prepareVpToken(
        requestObj,
        walletInstanceId,
        [pidToken, claims],
        decodedWIA.payload.cnf.jwk.kid
      );
    const signature = await sign(unsignedVpToken, walletInstanceKeyTag);
    const vpToken = await SignJWT.appendSignature(unsignedVpToken, signature);

    // Submit authorization response
    const ok = await RP.sendAuthorizationResponse(
      requestObj,
      vpToken,
      presentation_submission,
      entity
    );
    return result(ok);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
