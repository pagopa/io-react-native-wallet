import { generate } from "@pagopa/io-react-native-crypto";
import {
  PID,
  createCryptoContextFor,
  getEntityConfiguration,
  PidIssuerEntityConfiguration,
} from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import getWalletInstanceAttestation from "./get-attestation";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
const pidProviderBaseUrl = "https://api.eudi-wallet-it-pid-provider.it/ci";

export default async (pidKeyTag = Math.random().toString(36).substr(2, 5)) => {
  try {
    // generate Key for Wallet Instance Attestation
    const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);
    const instanceAttestation = await getWalletInstanceAttestation(
      walletInstanceKeyTag
    ).then(toResultOrReject);

    // Obtain metadata
    const pidEC = await getEntityConfiguration(pidProviderBaseUrl).then((_) =>
      PidIssuerEntityConfiguration.parse(_.payload)
    );

    // Generate fresh key for PID binding
    // ensure the key esists befor starting the issuing process
    await generate(pidKeyTag);

    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);
    const pidCryptoContext = createCryptoContextFor(pidKeyTag);

    // Auth Token request
    const authRequest = PID.Issuing.getAuthToken({ wiaCryptoContext });
    const authConf = await authRequest(
      instanceAttestation,
      walletProviderBaseUrl,
      pidEC
    );

    // Credential request
    const credentialRequest = PID.Issuing.getCredential({ pidCryptoContext });
    const pid = await credentialRequest(authConf, pidEC, {
      birthDate: "01/01/1990",
      fiscalCode: "AAABBB00A00A000A",
      name: "NAME",
      surname: "SURNAME",
    });

    // throw if decode fails
    PID.SdJwt.decode(pid.credential);

    return result(pid.credential);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
