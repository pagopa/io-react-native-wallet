import { verifyMrtdChallenge } from "@pagopa/io-wallet-oauth2";
import { IoWalletError } from "../../../utils/errors";
import { createVerifyJwtFromJwks } from "../../../utils/callbacks";
import type { MRTDPoPApi } from "../api/mrtd-pop";

export const verifyAndParseChallengeInfo: MRTDPoPApi["verifyAndParseChallengeInfo"] =
  async (issuerConf, challengeInfoJwt, { wiaCryptoContext }) => {
    const clientId = await wiaCryptoContext.getPublicKey().then((x) => x.kid);

    if (!clientId) {
      throw new IoWalletError(
        "Could not extract client_id from Wallet Attestation"
      );
    }

    const verified = await verifyMrtdChallenge({
      challengeJwt: challengeInfoJwt,
      clientId,
      callbacks: {
        verifyJwt: createVerifyJwtFromJwks(issuerConf.keys),
      },
    });

    return verified.payload;
  };
