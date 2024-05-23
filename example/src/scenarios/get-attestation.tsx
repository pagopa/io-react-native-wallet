import { generate } from "@pagopa/io-react-native-crypto";
import {
  WalletInstanceAttestation,
  createCryptoContextFor,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { WALLET_PROVIDER_BASE_URL } from "@env";

export default (integrityContext: IntegrityContext) =>
  async (walletInstanceKeyTag = Math.random().toString(36).substr(2, 5)) => {
    try {
      // generate Key for Wallet Instance Attestation
      // ensure the key esists befor starting the issuing process
      await generate(walletInstanceKeyTag);

      const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);
      const issuingAttestation = await WalletInstanceAttestation.getAttestation(
        {
          wiaCryptoContext,
          integrityContext,
          walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
        }
      );

      return result(issuingAttestation);
    } catch (e) {
      console.error(e);
      return error(e);
    }
  };
