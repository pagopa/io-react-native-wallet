import { generate } from "@pagopa/io-react-native-crypto";
import { PID } from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import getWalletInstanceAttestation from "./get-attestation";
import { createCryptoContextFor } from "../utils";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
const pidProviderBaseUrl = "https://api.eudi-wallet-it-pid-provider.it";

export default async (pidKeyTag = Math.random().toString(36).substr(2, 5)) => {
  try {
    // generate Key for Wallet Instance Attestation
    const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);
    const instanceAttestation = await getWalletInstanceAttestation(
      walletInstanceKeyTag
    ).then(toResultOrReject);

    // Generate fresh key for PID binding
    // ensure the key esists befor starting the issuing process
    await generate(pidKeyTag);

    // Start pid issuing flow
    const issuingPID = new PID.Issuing(
      pidProviderBaseUrl,
      walletProviderBaseUrl,
      instanceAttestation,
      createCryptoContextFor(pidKeyTag),
      createCryptoContextFor(walletInstanceKeyTag)
    );

    // PAR request
    await issuingPID.getPar();

    // Auth Token request
    const authToken = await issuingPID.getAuthToken();

    // Credential request
    const pid = await issuingPID.getCredential(
      authToken.c_nonce,
      authToken.access_token,
      {
        birthDate: "01/01/1990",
        fiscalCode: "AAABBB00A00A000A",
        name: "NAME",
        surname: "SURNAME",
      }
    );

    // throw if decode fails
    PID.SdJwt.decode(pid.credential);

    return result(pid.credential);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
