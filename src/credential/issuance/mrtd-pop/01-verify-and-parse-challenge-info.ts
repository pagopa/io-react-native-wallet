import {
  decode as decodeJwt,
  getJwkFromHeader,
} from "@pagopa/io-react-native-jwt";
import { verifyMrtdChallenge } from "@pagopa/io-wallet-oauth2";
import { IoWalletError } from "../../../utils/errors";
import { partialCallbacks } from "../../../utils/callbacks";
import type { MRTDPoPApi } from "../api/mrtd-pop";

export const verifyAndParseChallengeInfo: MRTDPoPApi["verifyAndParseChallengeInfo"] =
  async (issuerConf, challengeInfoJwt, { wiaCryptoContext }) => {
    const clientId = await wiaCryptoContext.getPublicKey().then((x) => x.kid);

    if (!clientId) {
      throw new IoWalletError(
        "Could not extract client_id from Wallet Attestation"
      );
    }

    const { protectedHeader } = decodeJwt(challengeInfoJwt);
    const signerJwk = getJwkFromHeader(protectedHeader, issuerConf.keys);

    const verified = await verifyMrtdChallenge({
      challengeJwt: challengeInfoJwt,
      clientId,
      callbacks: partialCallbacks,
      signer: {
        alg: "ES256",
        method: "jwk",
        publicJwk: signerJwk,
      },
    });
    console.log(verified)
    return verified.payload;
  };
