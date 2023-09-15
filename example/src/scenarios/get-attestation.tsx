import { generate, sign } from "@pagopa/io-react-native-crypto";
import { WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";

export default async (
  walletInstanceKeyTag = Math.random().toString(36).substr(2, 5)
) => {
  try {
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

    // generate Wallet Instance Attestation
    const instanceAttestation = await issuingAttestation.getAttestation(
      attestationRequest,
      signature
    );

    return result(instanceAttestation);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
