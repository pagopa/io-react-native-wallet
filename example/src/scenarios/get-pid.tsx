import { generate } from "@pagopa/io-react-native-crypto";
import {
  PID,
  createCryptoContextFor,
  getCredentialIssuerEntityConfiguration,
  getTrustAnchorEntityConfiguration,
  verifyTrustChain,
  renewTrustChain,
} from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import getWalletInstanceAttestation from "./get-attestation";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
const pidProviderBaseUrl = "https://api.eudi-wallet-it-pid-provider.it/ci";
const trustAnchorBaseUrl =
  "https://demo.federation.eudi.wallet.developers.italia.it/";

async function trust(trustChain: string[]): Promise<void> {
  const trustAnchorEntity = await getTrustAnchorEntityConfiguration(
    trustAnchorBaseUrl
  );

  // test verify trust chain
  await verifyTrustChain(trustAnchorEntity, trustChain);

  // test renew of the trust chain
  // (just for test, needed only when input chain fails to validate)
  const renewedChain = await renewTrustChain(trustChain);
  await verifyTrustChain(trustAnchorEntity, renewedChain);
}

export default async (pidKeyTag = Math.random().toString(36).substr(2, 5)) => {
  try {
    // generate Key for Wallet Instance Attestation
    const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);

    const instanceAttestation = await getWalletInstanceAttestation(
      walletInstanceKeyTag
    ).then(toResultOrReject);

    // Obtain PID metadata
    const pidEntityConfiguration = await getCredentialIssuerEntityConfiguration(
      pidProviderBaseUrl
    );

    // Auth Token request
    const authRequest = PID.Issuing.authorizeIssuing({ wiaCryptoContext });
    const authConf = await authRequest(
      instanceAttestation,
      walletProviderBaseUrl,
      pidEntityConfiguration,
      {
        birthDate: "01/01/1990",
        fiscalCode: "AAABBB00A00A000A",
        name: "NAME",
        surname: "SURNAME",
      }
    );

    // Generate fresh key for PID binding
    // ensure the key esists befor starting the issuing process
    await generate(pidKeyTag);
    const pidCryptoContext = createCryptoContextFor(pidKeyTag);

    // Credential request
    const credentialRequest = PID.Issuing.getCredential({ pidCryptoContext });
    const pid = await credentialRequest(authConf, pidEntityConfiguration);

    // throw if decode fails
    const decoded = PID.SdJwt.decode(pid.credential);

    // evaluate the trust chain of the credential
    const trustChain = decoded.sdJwt.header.trust_chain;
    await trust(trustChain);

    return result(pid.credential);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
