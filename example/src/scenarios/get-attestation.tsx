import { generate } from "@pagopa/io-react-native-crypto";
import { WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { createCryptoContextFor } from "../utils";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";

export default async (
  walletInstanceKeyTag = Math.random().toString(36).substr(2, 5)
) => {
  try {
    // generate Key for Wallet Instance Attestation
    // ensure the key esists befor starting the issuing process
    await generate(walletInstanceKeyTag);
    const issuingAttestation = new WalletInstanceAttestation.Issuing(
      walletProviderBaseUrl,
      createCryptoContextFor(walletInstanceKeyTag)
    );

    // generate Wallet Instance Attestation
    const instanceAttestation = await issuingAttestation.getAttestation();

    return result(instanceAttestation);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
