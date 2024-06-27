import {
  Credential,
  WalletInstanceAttestation,
  createCryptoContextFor,
  type IdentificationContext,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";

import { openAuthenticationSession } from "@pagopa/io-react-native-login-utils";
import {
  REDIRECT_URI,
  WALLET_PID_PROVIDER_BASE_URL,
  WALLET_PROVIDER_BASE_URL,
} from "@env";
import uuid from "react-native-uuid";
import { generate } from "@pagopa/io-react-native-crypto";

export default (integrityContext: IntegrityContext) => async () => {
  try {
    // Obtain a wallet attestation. A wallet instance must be created before this step.
    const walletInstanceKeyTag = uuid.v4().toString();
    await generate(walletInstanceKeyTag);
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);

    const walletInstanceAttestation =
      await WalletInstanceAttestation.getAttestation({
        wiaCryptoContext,
        integrityContext,
        walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
      });

    // Create identification context
    const identificationContext: IdentificationContext = {
      identify: openAuthenticationSession,
    };

    // Start the issuance flow
    const startFlow: Credential.Issuance.StartFlow = () => ({
      issuerUrl: WALLET_PID_PROVIDER_BASE_URL,
      credentialType: "PersonIdentificationData",
    });

    const { issuerUrl, credentialType } = startFlow();

    // Evaluate issuer trust
    const { issuerConf } = await Credential.Issuance.evaluateIssuerTrust(
      issuerUrl
    );

    // Start user authorization
    const authRes = await Credential.Issuance.startUserAuthorization(
      issuerConf,
      credentialType,
      {
        walletInstanceAttestation,
        identificationContext,
        redirectUri: `${REDIRECT_URI}`,
        wiaCryptoContext,
        idphint: "https://demo.spid.gov.it",
      }
    );
    console.log(authRes);
    return result(authRes);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
