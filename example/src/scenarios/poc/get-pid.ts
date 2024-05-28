import {
  Credential,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "../types";
import getWalletInstanceAttestation from "./get-attestation";
import { generate } from "@pagopa/io-react-native-crypto";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";

const rnd = () => Math.random().toString(36).substr(2, 5);

/**
 * A dummy implementation of CompleteUserAuthorization that uses static values.
 * Used to replace unimplemented specifications by the Issuer
 * Waiting for the Issuer to implement CIE authorization
 * TODO: [SIW-630]
 */
export const completeUserAuthorizationWithCIE: Credential.Issuance.CompleteUserAuthorization =
  async (_, __) => {
    return { code: "static_code" };
  };

export default async (credentialKeyTag = rnd()) => {
  try {
    // obtain wallet instance attestation
    const walletInstanceKeyTag = rnd();
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);
    const walletInstanceAttestation = await getWalletInstanceAttestation(
      walletInstanceKeyTag
    ).then(toResultOrReject);

    // obtain PID
    const { type: credentialType, url: credentialProviderBaseUrl } =
      /* startFLow()*/ {
        type: "PersonIdentificationData",
        url: "https://api.eudi-wallet-it-pid-provider.it/ci",
      };

    const { issuerConf } = await Credential.Issuance.evaluateIssuerTrust(
      credentialProviderBaseUrl
    );

    const { clientId, requestUri } =
      await Credential.Issuance.startUserAuthorization(
        issuerConf,
        credentialType,
        {
          walletInstanceAttestation,
          walletProviderBaseUrl,
          wiaCryptoContext,
          additionalParams:
            // TODO: [SIW-630] do not pass CIE data
            {
              birth_date: "01/01/1990",
              fiscal_code: "AAABBB00A00A000A",
              name: "NAME",
              surname: "SURNAME",
            },
        }
      );

    // This should be implemented with proper CIE authorization
    const { code } = await completeUserAuthorizationWithCIE(
      requestUri,
      clientId
    );

    const { accessToken, nonce } = await Credential.Issuance.authorizeAccess(
      issuerConf,
      code,
      clientId,
      {
        walletInstanceAttestation,
        walletProviderBaseUrl,
      }
    );

    await generate(credentialKeyTag);
    const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

    const { credential, format } = await Credential.Issuance.obtainCredential(
      issuerConf,
      accessToken,
      nonce,
      clientId,
      credentialType,
      "vc+sd-jwt",
      {
        walletProviderBaseUrl,
        credentialCryptoContext,
      }
    );

    const { parsedCredential } =
      await Credential.Issuance.verifyAndParseCredential(
        issuerConf,
        credential,
        format,
        { credentialCryptoContext, ignoreMissingAttributes: true }
      );

    console.log(parsedCredential);

    return result(credential);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
