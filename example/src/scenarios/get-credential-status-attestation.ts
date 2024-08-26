import { Credential } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { WALLET_EAA_PROVIDER_BASE_URL } from "@env";
import type { CredentialContext } from "../screens/HomeScreen";

/**
 * Example scenario that shows how to get the status of a credential attestation. It currently works only with the MDL.
 * @param credentialContext - The credential context which contains the credential and its crypto context. Set by the get credential scenario.
 */
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

    const rawStatusAttestation = await Credential.Status.statusAttestation(
      issuerConf,
      credential,
      credentialCryptoContext
    );

    console.log(rawStatusAttestation);

    const parsedStatusAttestation =
      await Credential.Status.verifyAndParseStatusAttestation(
        issuerConf,
        rawStatusAttestation,
        {
          credentialCryptoContext,
        }
      );

    console.log(parsedStatusAttestation);

    return result(parsedStatusAttestation);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
