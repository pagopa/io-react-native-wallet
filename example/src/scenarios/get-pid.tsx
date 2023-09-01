import { generate, sign } from "@pagopa/io-react-native-crypto";
import { thumbprint } from "@pagopa/io-react-native-jwt";
import { PID, WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
const pidProviderBaseUrl = "https://api.eudi-wallet-it-pid-provider.it";

export default async () => {
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
    const instanceAttestation = (await issuingAttestation.getAttestation(
      attestationRequest,
      signature
    )) as string;

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

    // Token request
    const authToken = await issuingPID.getAuthToken();

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
    
    // throw if decode fails
    PID.SdJwt.decode(pid.credential);

    return result(pid.credential);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
