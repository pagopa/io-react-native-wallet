import { Credential } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { WALLET_PID_PROVIDER_BASE_URL } from "@env";
import type { PidContext } from "../App";
import { Status } from "src/credential";

export default (pidContext: PidContext) => async () => {
  try {
    const { pid, pidCryptoContext } = pidContext;

    // Start the issuance flow
    const startFlow: Credential.Status.StartFlow = () => ({
      issuerUrl: WALLET_PID_PROVIDER_BASE_URL,
    });

    const { issuerUrl } = startFlow();

    // Evaluate issuer trust
    const { issuerConf } = await Credential.Status.evaluateIssuerTrust(
      issuerUrl
    );

    const res = await Status.statusAttestation(
      issuerConf,
      pid,
      pidCryptoContext
    );
    return result(res);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
