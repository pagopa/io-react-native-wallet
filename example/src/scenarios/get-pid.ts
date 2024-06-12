import {
  Credential,
  createCryptoContextFor,
  completeUserAuthorization,
  type IdentificationContext,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import { generate } from "@pagopa/io-react-native-crypto";
import getAttestation from "./get-attestation";
import { openAuthenticationSession } from "@pagopa/io-react-native-login-utils";

const walletProviderBaseUrl = "http://localhost:8050/"; // make it ENV

const rnd = () => Math.random().toString(36).substr(2, 5);

export default async (
  integrityContext: IntegrityContext,
  credentialKeyTag = rnd()
) => {
  try {
    // obtain wallet instance attestation
    const walletInstanceKeyTag = rnd();
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);
    const walletInstanceAttestation = await getAttestation(
      integrityContext
    )().then(toResultOrReject);

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
          idphint: "EXAMPLE", // change me
        }
      );

    // Create identification context
    const identificationContext: IdentificationContext = {
      identify: openAuthenticationSession,
    };

    // This should be implemented with proper CIE authorization
    const { code } = await Credential.Issuance.completeUserAuthorization(
      identificationContext,
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
