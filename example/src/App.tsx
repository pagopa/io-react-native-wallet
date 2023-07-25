import * as React from "react";
import { generate } from "@pagopa/io-react-native-crypto";
import { sign } from "@pagopa/io-react-native-crypto";
import {
  StyleSheet,
  View,
  Text,
  Button,
  SafeAreaView,
  Alert,
} from "react-native";

import { PID, WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";
import { thumbprint } from "@pagopa/io-react-native-jwt";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
const pidProviderBaseUrl = "https://api.wakala.it/it-pid-provider/";

const pidToken =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0cnVzdF9jaGFpbiI6W10sInR5cCI6InZjK3NkLWp3dCJ9.eyJzdWIiOiJMeExqRXJNUkd5cTRmb0ZCODh1TUxiVFQ2cS1rUHNITDhNTGktYloyUWRVIiwidmVyaWZpZWRfY2xhaW1zIjp7ImNsYWltcyI6eyJfc2QiOlsiSTllS2R6dk5oQWd1V3pGdFhPMmZiVUNaVWFoUDlwZkVaVXJaamhldGFEYyIsIm85OFVkeV90aVlvZzVJWFVibDVoMnJDSHhLYnljU1c0RDQ4Uno2V3JlejQiLCJaN3Fja1RnUjc0WjM2TFhtaDBXOFV0WkVka0Jta1pzUjVCTzRTenc3ZzY4IiwiMGswYTRoeXgyeWNHQVlITFFpMWJ4UU9MdnUzUUktdmNyYUZOLUFzX3VnMCIsIlZDV1NpY2w4cWcyUEcxN0VTSFN3NVBMdEFCdldYTy1oakR1TURuME5KTjQiLCI1QWJKOVlTRTR6TW9DTUZ6ZW4xMTV2QWtmSjJKc25qMVJ1WDVZb0ZkUzNJIl19LCJ2ZXJpZmljYXRpb24iOnsidHJ1c3RfZnJhbWV3b3JrIjoiZWlkYXMiLCJhc3N1cmFuY2VfbGV2ZWwiOiJoaWdoIiwiX3NkIjpbImZZZUVNcWE5WEFuQXQ0OFdmcVZlejQwSW1jVk1Jc1plYkp4a3F5TmlKcUEiXX19LCJfc2RfYWxnIjoic2hhLTI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsImNuZiI6eyJqd2siOnsiY3J2IjoiUC0yNTYiLCJrdHkiOiJFQyIsIngiOiJxckpyajNBZl9CNTdzYk9JUnJjQk03YnI3d09jOHluajdsSEZQVGVmZlVrIiwieSI6IjFIMGNXRHlHZ3ZVOHcta1BLVV94eWNPQ1VOVDJvMGJ3c2xJUXRuUFU2aU0iLCJraWQiOiI1dDVZWXBCaE4tRWdJRUVJNWlVenI2cjBNUjAyTG5WUTBPbWVrbU5LY2pZIn19LCJ0eXBlIjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwianRpIjoidXJuOnV1aWQ6YTQ0MmEzNDAtYjM4ZS00OWMzLTlkNDktZjc1OWY0MDgzMWU2Iiwic3RhdHVzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3N0YXR1cyIsImlhdCI6MTY4OTY5MzU1OSwiZXhwIjoyMDA1MjY5NTU5fQ.tpgf0oo0-RJxkL98ipw5xX3ftEmZw-fQVA2c2aM1gZ_jfcDXE2_Xs2aMpT0hy7w4IhP5V0B0HmXtTVYXwVu8kQ~WyJyYzQ0Z3ZRUy1TNDFFUDhSVU1pdFRRIiwiZXZpZGVuY2UiLFt7InR5cGUiOiJlbGVjdHJvbmljX3JlY29yZCIsInJlY29yZCI6eyJ0eXBlIjoiZWlkYXMuaXQuY2llIiwic291cmNlIjp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiTWluaXN0ZXJvIGRlbGwnSW50ZXJubyIsIm9yZ2FuaXphdGlvbl9pZCI6Im1faXQiLCJjb3VudHJ5X2NvZGUiOiJJVCJ9fX1dXQ~WyI2dzFfc29SWEZnYUhLZnBZbjNjdmZRIiwiZ2l2ZW5fbmFtZSIsIk1hcmlvIl0~WyJoNlQ3MXIycVZmMjlsNXhCNnUzdWx3IiwiZmFtaWx5X25hbWUiLCJSb3NzaSJd~WyJvR29iQl9uZXRZMEduS3hUN3hsVTRBIiwidW5pcXVlX2lkIiwiaWRBTlBSIl0~WyJmdU5wOTdIZjN3VjZ5NDh5LVFaaElnIiwiYmlydGhkYXRlIiwiMTk4MC0xMC0wMSJd~WyJwLTlMenlXSFpCVkR2aFhEV2tOMnhBIiwicGxhY2Vfb2ZfYmlydGgiLHsiY291bnRyeSI6IklUIiwibG9jYWxpdHkiOiJSb21lIn1d~WyI5UnFLdWwzeHh6R2I4X1J1Zm5BSmZRIiwidGF4X2lkX251bWJlciIsIlRJTklULVJTU01SQTgwQTEwSDUwMUEiXQ";

export default function App() {
  const [result, setResult] = React.useState<string | undefined>();

  React.useEffect(() => {
    setResult("READY");
  }, []);

  const decodePid = () => {
    try {
      const pidWithToken = PID.SdJwt.decode(pidToken);
      setResult(JSON.stringify(pidWithToken.pid.claims));
    } catch (e) {
      showError(e);
    }
  };

  const verifyPid = async () => {
    try {
      await PID.SdJwt.verify(pidToken);
      setResult("✅ Verification OK!\n");
    } catch (e) {
      showError(e);
    }
  };

  const getAttestation = async () => {
    try {
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

      // generate Wallet Instance Attestation
      const instanceAttestation = await issuingAttestation.getAttestation(
        attestationRequest,
        signature
      );

      setResult(JSON.stringify(instanceAttestation));
    } catch (e) {
      console.error(e);
      showError(e);
    }
  };

  const getPid = async () => {
    try {
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
      const instanceAttestation = await issuingAttestation.getAttestation(
        attestationRequest,
        signature
      );

      // clientId must be the Wallet Instance public key thumbprint
      const clientId = await thumbprint(walletInstancePublicKey);

      // Start pid issuing flow
      const issuingPID = new PID.Issuing(
        pidProviderBaseUrl,
        walletProviderBaseUrl,
        instanceAttestation,
        clientId
      );

      // Generate jwt for PAR wallet instance attestation
      const unsignedJwtForPar = await issuingPID.getUnsignedJwtForPar(
        walletInstancePublicKey
      );
      const parSignature = await sign(unsignedJwtForPar, walletInstanceKeyTag);

      // PAR request
      await issuingPID.getPar(unsignedJwtForPar, parSignature);

      //Generate fresh keys for DPoP
      const dPopKeyTag = Math.random().toString(36).substr(2, 5);
      const dPopKey = await generate(dPopKeyTag);

      const unsignedDPopForToken = await issuingPID.getUnsignedDPoP(dPopKey);
      const dPopTokenSignature = await sign(unsignedDPopForToken, dPopKeyTag);

      // Token request
      const authToken = await issuingPID.getAuthToken(
        unsignedDPopForToken,
        dPopTokenSignature
      );

      // Generate fresh key for PID binding
      const pidKeyTag = Math.random().toString(36).substr(2, 5);
      const pidKey = await generate(pidKeyTag);

      //Generate nonce proof
      const unsignedNonceProof = await issuingPID.getUnsignedNonceProof(
        authToken.c_nonce
      );
      const nonceProofSignature = await sign(unsignedNonceProof, pidKeyTag);

      // Generate DPoP for PID key
      const unsignedDPopForPid = await issuingPID.getUnsignedDPoP(pidKey);
      const dPopPidSignature = await sign(unsignedDPopForPid, pidKeyTag);

      // Credential reuqest
      const pid = await issuingPID.getCredential(
        unsignedDPopForPid,
        dPopPidSignature,
        unsignedNonceProof,
        nonceProofSignature,
        authToken.access_token,
        {
          birthDate: "01/01/1990",
          fiscalCode: "AAABBB00A00A000A",
          name: "NAME",
          surname: "SURNAME",
        }
      );

      setResult(JSON.stringify(pid.credential));
    } catch (e) {
      console.error(e);
      showError(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Button title="Decode PID" onPress={decodePid} />
        <Button title="Verify PID" onPress={verifyPid} />
        <Button title="Get WIA" onPress={getAttestation} />
        <Button title="Get PID" onPress={getPid} />
      </View>
      <View>
        <Text style={styles.title}>{result}</Text>
      </View>
    </SafeAreaView>
  );
}

const showError = (e: any) => {
  Alert.alert("Error!", JSON.stringify(e), [{ text: "OK" }]);
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 16,
  },
  title: {
    textAlign: "center",
    marginVertical: 8,
  },
  fixToText: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  separator: {
    marginVertical: 8,
    borderBottomColor: "#737373",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
