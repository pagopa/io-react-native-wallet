import { Credential } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { WALLET_EAA_PROVIDER_BASE_URL } from "@env";
import type { CredentialContext } from "../App";

export default (credentialContext: CredentialContext) => async () => {
  try {
    const { credential, credentialCryptoContext } = credentialContext;

    // Start the issuance flow
    const startFlow: Credential.Status.StartFlow = () => ({
      issuerUrl: WALLET_EAA_PROVIDER_BASE_URL,
    });

    const { issuerUrl } = startFlow();

    // Evaluate issuer trust
    const { issuerConf } = await Credential.Status.evaluateIssuerTrust(
      issuerUrl
    );

    const res = await Credential.Status.statusAttestation(
      issuerConf,
      credential,
      credentialCryptoContext
    );
    return result(res);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
