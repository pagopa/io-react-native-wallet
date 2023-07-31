import { sign, getPublicKey, generate } from "@pagopa/io-react-native-crypto";
import { RelyingPartySolution } from "@pagopa/io-react-native-wallet";
import { WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { SignJWT } from "@pagopa/io-react-native-jwt";

// eudiw://authorize?client_id=https://verifier.example.org&request_uri=https://verifier.example.org/request_uri
const QR =
  "ZXVkaXc6Ly9hdXRob3JpemU/Y2xpZW50X2lkPWh0dHBzOi8vdmVyaWZpZXIuZXhhbXBsZS5vcmcmcmVxdWVzdF91cmk9aHR0cHM6Ly92ZXJpZmllci5leGFtcGxlLm9yZy9yZXF1ZXN0X3VyaQ==";

const pidToken =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0cnVzdF9jaGFpbiI6W10sInR5cCI6InZjK3NkLWp3dCJ9.eyJzdWIiOiJMeExqRXJNUkd5cTRmb0ZCODh1TUxiVFQ2cS1rUHNITDhNTGktYloyUWRVIiwidmVyaWZpZWRfY2xhaW1zIjp7ImNsYWltcyI6eyJfc2QiOlsiSTllS2R6dk5oQWd1V3pGdFhPMmZiVUNaVWFoUDlwZkVaVXJaamhldGFEYyIsIm85OFVkeV90aVlvZzVJWFVibDVoMnJDSHhLYnljU1c0RDQ4Uno2V3JlejQiLCJaN3Fja1RnUjc0WjM2TFhtaDBXOFV0WkVka0Jta1pzUjVCTzRTenc3ZzY4IiwiMGswYTRoeXgyeWNHQVlITFFpMWJ4UU9MdnUzUUktdmNyYUZOLUFzX3VnMCIsIlZDV1NpY2w4cWcyUEcxN0VTSFN3NVBMdEFCdldYTy1oakR1TURuME5KTjQiLCI1QWJKOVlTRTR6TW9DTUZ6ZW4xMTV2QWtmSjJKc25qMVJ1WDVZb0ZkUzNJIl19LCJ2ZXJpZmljYXRpb24iOnsidHJ1c3RfZnJhbWV3b3JrIjoiZWlkYXMiLCJhc3N1cmFuY2VfbGV2ZWwiOiJoaWdoIiwiX3NkIjpbImZZZUVNcWE5WEFuQXQ0OFdmcVZlejQwSW1jVk1Jc1plYkp4a3F5TmlKcUEiXX19LCJfc2RfYWxnIjoic2hhLTI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsImNuZiI6eyJqd2siOnsiY3J2IjoiUC0yNTYiLCJrdHkiOiJFQyIsIngiOiJxckpyajNBZl9CNTdzYk9JUnJjQk03YnI3d09jOHluajdsSEZQVGVmZlVrIiwieSI6IjFIMGNXRHlHZ3ZVOHcta1BLVV94eWNPQ1VOVDJvMGJ3c2xJUXRuUFU2aU0iLCJraWQiOiI1dDVZWXBCaE4tRWdJRUVJNWlVenI2cjBNUjAyTG5WUTBPbWVrbU5LY2pZIn19LCJ0eXBlIjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwianRpIjoidXJuOnV1aWQ6YTQ0MmEzNDAtYjM4ZS00OWMzLTlkNDktZjc1OWY0MDgzMWU2Iiwic3RhdHVzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3N0YXR1cyIsImlhdCI6MTY4OTY5MzU1OSwiZXhwIjoyMDA1MjY5NTU5fQ.tpgf0oo0-RJxkL98ipw5xX3ftEmZw-fQVA2c2aM1gZ_jfcDXE2_Xs2aMpT0hy7w4IhP5V0B0HmXtTVYXwVu8kQ~WyJyYzQ0Z3ZRUy1TNDFFUDhSVU1pdFRRIiwiZXZpZGVuY2UiLFt7InR5cGUiOiJlbGVjdHJvbmljX3JlY29yZCIsInJlY29yZCI6eyJ0eXBlIjoiZWlkYXMuaXQuY2llIiwic291cmNlIjp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiTWluaXN0ZXJvIGRlbGwnSW50ZXJubyIsIm9yZ2FuaXphdGlvbl9pZCI6Im1faXQiLCJjb3VudHJ5X2NvZGUiOiJJVCJ9fX1dXQ~WyI2dzFfc29SWEZnYUhLZnBZbjNjdmZRIiwiZ2l2ZW5fbmFtZSIsIk1hcmlvIl0~WyJoNlQ3MXIycVZmMjlsNXhCNnUzdWx3IiwiZmFtaWx5X25hbWUiLCJSb3NzaSJd~WyJvR29iQl9uZXRZMEduS3hUN3hsVTRBIiwidW5pcXVlX2lkIiwiaWRBTlBSIl0~WyJmdU5wOTdIZjN3VjZ5NDh5LVFaaElnIiwiYmlydGhkYXRlIiwiMTk4MC0xMC0wMSJd~WyJwLTlMenlXSFpCVkR2aFhEV2tOMnhBIiwicGxhY2Vfb2ZfYmlydGgiLHsiY291bnRyeSI6IklUIiwibG9jYWxpdHkiOiJSb21lIn1d~WyI5UnFLdWwzeHh6R2I4X1J1Zm5BSmZRIiwidGF4X2lkX251bWJlciIsIlRJTklULVJTU01SQTgwQTEwSDUwMUEiXQ";

const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);

async function getAttestation(): Promise<{
  attestation: string;
  keytag: string;
}> {
  const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
  // generate Key for Wallet Instance Attestation
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
    // TODO [SIW-354]

    // Validate Request object signature
    // TODO [SIW-337]

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
    const unsignedVpToken = RP.prepareVpToken(requestObj, [pidToken, claims]);
    const signature = await sign(unsignedVpToken, walletInstanceKeyTag);
    const vpToken = await SignJWT.appendSignature(unsignedVpToken, signature);

    // Submit authorization response
    const ok = await RP.sendAuthorizationResponse(requestObj, vpToken);

    return result(ok);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
