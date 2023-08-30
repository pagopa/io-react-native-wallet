import { sign, generate, getPublicKey } from "@pagopa/io-react-native-crypto";
import { RelyingPartySolution } from "@pagopa/io-react-native-wallet";
import { WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { SignJWT, decode } from "@pagopa/io-react-native-jwt";

// eudiw://authorize?client_id=https://verifier.example.org&request_uri=https://verifier.example.org/request_uri
const QR =
  "aHR0cHM6Ly9kZW1vLnByb3h5LmV1ZGkud2FsbGV0LmRldmVsb3BlcnMuaXRhbGlhLml0L09wZW5JRDRWUD9jbGllbnRfaWQ9aHR0cHMlM0ElMkYlMkZkZW1vLnByb3h5LmV1ZGkud2FsbGV0LmRldmVsb3BlcnMuaXRhbGlhLml0JTJGT3BlbklENFZQJnJlcXVlc3RfdXJpPWh0dHBzJTNBJTJGJTJGZGVtby5wcm94eS5ldWRpLndhbGxldC5kZXZlbG9wZXJzLml0YWxpYS5pdCUyRk9wZW5JRDRWUCUyRnJlcXVlc3QtdXJpJTNGaWQlM0Q3OGNjMmUwYi05OTIwLTRkMjctOWUxNS1jMTkwY2U5M2IxMmM=";

const pidToken =
  "eyJ0eXAiOiJ2YytzZC1qd3QiLCJ0cnVzdF9jaGFpbiI6WyJleUpoYkdjaU9pSklVekkxTmlKOS5leUp6ZFdJaU9pSndhV1F0Y0hKdmRtbGtaWElpTENKcFlYUWlPakUyT0RjM01EUXpOamdzSW1WNGNDSTZNVGM0TnpjME1ETTJPSDAuWkVFN2hrSFZDUHdYR2dvNzAzNTg2NVlabDJNVGY0bzA1TlVUVFEtTFJYYyIsImV5SmhiR2NpT2lKSVV6STFOaUo5LmV5SnpkV0lpT2lKMGNuVnpkQzF5WldkcGMzUnllU0lzSW1saGRDSTZNVFk0Tnpjd05ETTJPQ3dpWlhod0lqb3hOemczTnpRd016WTRmUS5WLXlIc1drZmRDaUs3dHJtNHhMSkxwZHhpNUxKVGh2ekpOTV90V1l6elFFIl0sImFsZyI6IlJTMjU2Iiwia2lkIjoieFF4REp5UkIxWjVhTDNyM1dVYzRCRm9ycTV5ekhIRVU5eHgtRGw0X0lLRSJ9.eyJzdWIiOiJPcnZpWFlPTEU2NkFPS3Frc1FVbUUwdkwtY19RTGtvRXZBUFIxQVctdVNzIiwidmVyaWZpZWRfY2xhaW1zIjp7ImNsYWltcyI6eyJfc2QiOlsiLWw5Szc2VWF2NDJlbmhPRFBWN2JqOVJrdGYyX093UmFyVEI2M2VheThVNCIsIlAwMG9sN3hjb2YzSnQya3NnYS1SSllFNkJReEd5UU5tNTdmREZJcXkzLWMiLCJVMU5ZeXhQUm1EYTF1cnBjb2ltcVZmSFc0SF9iTXBwQ1YxNHNUTUo2NWpRIiwiWGtQZ2s0SThlRG15LXQ3dGp0YXh1V3FxVGNDY1VyVy1lMDd6V0dLZ2Z4MCIsImE4TF8yRFpRR0tKdUstVE5ETjV5Uzc0UjJscGZRY0ozZ2VnOW1VVy1ROUkiLCJjMzAxekp1dmV4YkwybkNlNEdkVm81T3BiYmJiNGZfbUxFbDVyaVFySDRBIl19LCJ2ZXJpZmljYXRpb24iOnsiYXNzdXJhbmNlX2xldmVsIjoiaGlnaCIsInRydXN0X2ZyYW1ld29yayI6ImVpZGFzIiwiX3NkIjpbInFMRlFxWW80UTBaSVRablo2dlhwY0FrMTVwSkw4Ui1Sa21VNVB1d2tuNXMiXX19LCJfc2RfYWxnIjoic2hhLTI1NiIsImlzcyI6Imh0dHBzOi8vYXBpLmV1ZGktd2FsbGV0LWl0LXBpZC1wcm92aWRlci5pdCIsImNuZiI6eyJqd2siOnsiY3J2IjoiUC0yNTYiLCJrdHkiOiJFQyIsImtpZCI6Ik9ydmlYWU9MRTY2QU9LcWtzUVVtRTB2TC1jX1FMa29FdkFQUjFBVy11U3MiLCJ4IjoiY3JsajdtQnRRbGdqcHVnaENYN3VsUHlSNTdKckxsdnlRVm5vSzZPOG1aTSIsInkiOiJ0a1JxbnM2eWFlZElGY1hIQkV0QzBqdzRoOXcyRjNUZ3B2alkzejdvNUYwIn19LCJleHAiOjE3MjUwMDczNTMsInR5cGUiOiJQZXJzb25JZGVudGlmaWNhdGlvbkRhdGEiLCJpYXQiOjE2OTMzODQ5NTMsImp0aSI6InVybjp1dWlkOjkzYzk5NzNjLWY5NDUtNDU2OS1hZDk5LTNjMTQ5ZDIzMzQwNCIsInN0YXR1cyI6Imh0dHBzOi8vYXBpLmV1ZGktd2FsbGV0LWl0LXBpZC1wcm92aWRlci5pdC9zdGF0dXMifQ.oHUFynStqbaLGQFto9dadulXFU8a-cTgdGZIAdptW-2uOUUeM6qqnSqrf-sSpiHtRK6wkA8MhNWjOU1rVVUBZHIyZeGEL-iqzyVnjCHGvpBorFacaHKBw_hAncBhQf2q66Wp88MPo0SA1UDsXuPChcBcka02TzFsw3gY5LQBGvcF0pyqmTkUIMtXiGTz5JM0nltkeHLl_BpMDsfef38oekskrgCZWe_qefdyOoyaCzpGigaGtUZEVchWl8HA884fw7Euj7JWii4iRFgG2Xy2lQD9wO1jd7Skg-cRRbnu4sksMAGzMDXqyJFR1Lw5PhRN7iKIc9bI2JQNXTgU43W6DQ~WyJzSU50czNjTXpvZHZiUE9ON183cTV3IiwiZXZpZGVuY2UiLFt7InR5cGUiOiJlbGVjdHJvbmljX3JlY29yZCIsInJlY29yZCI6eyJ0eXBlIjoiZWlkYXMuaXQuY2llIiwic291cmNlIjp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiTWluaXN0ZXJvIGRlbGxcdTAwMjdJbnRlcm5vIiwib3JnYW5pemF0aW9uX2lkIjoibV9pdCIsImNvdW50cnlfY29kZSI6IklUIn19fV1d~WyJ3TjZwLWRkcFVGUlhCZFlDc2Zfb2JRIiwiZ2l2ZW5fbmFtZSIsIk5BTUUiXQ~WyJNWWQ3b1FGUW93MEJoU2hBcFhzVnR3IiwiZmFtaWx5X25hbWUiLCJTVVJOQU1FIl0~WyI4WjV1UE9pNDJvT2xSb3ZhU0UzaEJRIiwidW5pcXVlX2lkIiwiaWRBTlBSIl0~WyIwUzFyb2N6UkY1Yng3aGxQeUhKeTJBIiwiYmlydGhkYXRlIiwiMDEvMDEvMTk5MCJd~WyJXSmZkSmJhaFFYVEhXY0xlbXpyWUNnIiwicGxhY2Vfb2ZfYmlydGgiLHsiY291bnRyeSI6IklUIiwibG9jYWxpdHkiOiJSb21lIn1d~WyJENXE4UVFmTHRuUFJrWjNJT3lzbGpBIiwidGF4X2lkX251bWJlciIsIkFBQUJCQjAwQTAwQTAwMEEiXQ";

const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);

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
    // obtain new attestation
    const WIA = await getAttestation();

    // Scan/Decode QR
    const { requestURI: authRequestUrl, clientId } =
      RelyingPartySolution.decodeAuthRequestQR(QR);

    // instantiate
    const RP = new RelyingPartySolution(clientId, WIA.attestation);

    const decodedWIA = decode(WIA.attestation);

    // Create unsigned dpop
    const unsignedDPoP = await RP.getUnsignedWalletInstanceDPoP(
      // @ts-ignore
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
    // TODO [SIW-354]

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

    // verified presentation is signed using the same key of the wallet attestation
    const { vp_token: unsignedVpToken, presentation_submission } =
      await RP.prepareVpToken(requestObj, [pidToken, claims]);
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
