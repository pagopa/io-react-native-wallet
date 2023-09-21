import { generate } from "@pagopa/io-react-native-crypto";
import { PID, createCryptoContextFor } from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import getWalletInstanceAttestation from "./get-attestation";
import { thumbprint } from "@pagopa/io-react-native-jwt";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
const pidProviderBaseUrl = "https://api.eudi-wallet-it-pid-provider.it/ci";

export default async (pidKeyTag = Math.random().toString(36).substr(2, 5)) => {
  try {
    // generate Key for Wallet Instance Attestation
    const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);

    const instanceAttestation = await getWalletInstanceAttestation(
      walletInstanceKeyTag
    ).then(toResultOrReject);

    // Obtain PID metadata
    const pidEntityConfiguration = await PID.Issuing.getEntityConfiguration()(
      pidProviderBaseUrl
    );

    // Auth Token request
    const authRequest = PID.Issuing.authorizeIssuing({ wiaCryptoContext });
    const authConf = await authRequest(
      instanceAttestation,
      walletProviderBaseUrl,
      pidEntityConfiguration
    );

    // Generate fresh key for PID binding
    // ensure the key esists befor starting the issuing process
    await generate(pidKeyTag);
    const pidCryptoContext = createCryptoContextFor(pidKeyTag);

    // Credential request
    const credentialRequest = PID.Issuing.getCredential({ pidCryptoContext });
    const pid = await credentialRequest(authConf, pidEntityConfiguration, {
      birthDate: "01/01/1990",
      fiscalCode: "AAABBB00A00A000A",
      name: "NAME",
      surname: "SURNAME",
    });

    // throw if decode fails
    const pidJwt = PID.SdJwt.decode(pid.credential);
    console.log(
      "PID holder binding JWK: ",
      await thumbprint(pidJwt.sdJwt.payload.cnf.jwk)
    );
    console.log(
      "PID public key: ",
      await thumbprint(await pidCryptoContext.getPublicKey())
    );

    return result(pid.credential);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
