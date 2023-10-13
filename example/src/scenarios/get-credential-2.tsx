import {
  Credential,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import getWalletInstanceAttestation from "./get-attestation";
import { generate } from "@pagopa/io-react-native-crypto";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";

const rnd = () => Math.random().toString(36).substr(2, 5);

export default async () => {
  try {
    // obtain wallet instance attestation
    const walletInstanceKeyTag = rnd();
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);
    const walletInstanceAttestation = await getWalletInstanceAttestation(
      walletInstanceKeyTag
    ).then(toResultOrReject);

    // obtain PID
    /* const pidKeyTag = Math.random().toString(36).substr(2, 5);
    const pidToken = await getPid(pidKeyTag).then(toResultOrReject);
    const pidCryptoContext = createCryptoContextFor(pidKeyTag);
 */
    const { type: credentialType, url: credentialProviderBaseUrl } =
      /* startFLow()*/ {
        type: "mDL",
        url: "https://api.eudi-wallet-it-issuer.it/rp",
      };

    const { issuerConf } = await Credential.Issuing.evaluateIssuerTrust()(
      credentialProviderBaseUrl
    );

    const authorizeUser = Credential.Issuing.authorizeUser({
      walletInstanceAttestation,
      walletProviderBaseUrl,
      wiaCryptoContext,
      userAuthorizationMethod: async (_) => {
        // TO BE IMPLEMENTED
        console.log("--> userAuthorizationMethod", _);
        return { code: "code", state: "state" };
      },
    });
    const { clientId, code } = await authorizeUser(issuerConf, credentialType);

    const authorizeAccess = Credential.Issuing.authorizeAccess({
      walletInstanceAttestation,
      walletProviderBaseUrl,
    });
    const { accessToken, nonce } = await authorizeAccess(
      issuerConf,
      code,
      clientId
    );

    const credentialKeyTag = rnd();
    await generate(credentialKeyTag);
    const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

    const obtainCredential = Credential.Issuing.obtainCredential({
      walletProviderBaseUrl,
      credentialCryptoContext,
    });
    const { credential } = await obtainCredential(
      issuerConf,
      accessToken,
      nonce,
      clientId,
      credentialType
    );

    console.log("--> obtained credential", credential);

    return result("OK");
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
