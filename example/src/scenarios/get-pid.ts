import {
  Credential,
  createCryptoContextFor,
  type IdentificationContext,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import getAttestation from "./get-attestation";
import { openAuthenticationSession } from "@pagopa/io-react-native-login-utils";
import {
  REDIRECT_URI,
  WALLET_PID_PROVIDER_BASE_URL,
  WALLET_PID_PROVIDER_REDIRECT_OVERRIDE_URL,
} from "@env";
import uuid from "react-native-uuid";
import { generate } from "@pagopa/io-react-native-crypto";

export default (integrityContext: IntegrityContext) => async () => {
  try {
    // Obtain a wallet attestation. A wallet instance must be created before this step.
    const walletInstanceKeyTag = uuid.v4().toString();
    await generate(walletInstanceKeyTag);
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);
    const walletInstanceAttestation = await getAttestation(
      integrityContext
    )().then(toResultOrReject);

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
        redirectUri: REDIRECT_URI,
        overrideRedirectUri: WALLET_PID_PROVIDER_REDIRECT_OVERRIDE_URL, // currently we are overriding the redirect URI until we have an actual implementation
        wiaCryptoContext,
        idphint: "EXAMPLE",
      }
    );

    return result(authRes);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
