import { verifyMrtdChallenge } from "@pagopa/io-wallet-oauth2";

import type { MRTDPoPApi } from "../api/mrtd-pop";

import { createVerifyJwtFromJwks } from "../../../utils/callbacks";
import { IoWalletError } from "../../../utils/errors";

export const verifyAndParseChallengeInfo: MRTDPoPApi["verifyAndParseChallengeInfo"] =
  async (issuerConf, challengeInfoJwt, { wiaCryptoContext }) => {
    const clientId = await wiaCryptoContext.getPublicKey().then((x) => x.kid);

    if (!clientId) {
      throw new IoWalletError(
        "Could not extract client_id from Wallet Attestation",
      );
    }

    const verified = await verifyMrtdChallenge({
      callbacks: {
        verifyJwt: createVerifyJwtFromJwks(issuerConf.keys),
      },
      challengeJwt: challengeInfoJwt,
      clientId,
    });

    return verified.payload;
  };
