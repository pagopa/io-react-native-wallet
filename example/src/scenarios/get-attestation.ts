import { generate } from "@pagopa/io-react-native-crypto";
import {
  WalletInstanceAttestation,
  createCryptoContextFor,
  Errors,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { WALLET_PROVIDER_BASE_URL } from "@env";
import appFetch from "../utils/fetch";

/**
 * Obtain a Wallet Instance Attestation by providing an integrity context which must be the same
 * used when creating the Wallet Instance.
 */
export default (integrityContext: IntegrityContext) =>
  async (walletInstanceKeyTag = Math.random().toString(36).substr(2, 5)) => {
    try {
      // generate Key for Wallet Instance Attestation
      // ensure the key esists befor starting the issuing process
      await generate(walletInstanceKeyTag);

      const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);

      /**
       * Obtains a new Wallet Instance Attestation.
       * WARNING: The integrity context must be the same used when creating the Wallet Instance with the same keytag.
       */
      const issuingAttestation = await WalletInstanceAttestation.getAttestation(
        {
          wiaCryptoContext,
          integrityContext,
          walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
          appFetch,
        }
      );

      return result(issuingAttestation);
    } catch (e) {
      if (e instanceof Errors.WalletInstanceRevokedError) {
        console.error("Wallet Instance revoked");
      }
      if (e instanceof Errors.WalletInstanceNotFoundError) {
        console.error("Wallet Instance not found");
      }
      console.error(e);
      return error(e);
    }
  };
