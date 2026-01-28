import {
  decode as decodeJwt,
  verify as verifyJwt,
} from "@pagopa/io-react-native-jwt";
import { IoWalletError } from "../../../utils/errors";
import type { MRTDPoPApi } from "../api/mrtd-pop";
import { MrtdProofChallengeInfoJwt } from "./types";

export const verifyAndParseChallengeInfo: MRTDPoPApi["verifyAndParseChallengeInfo"] =
  async (issuerConf, challengeInfoJwt: string, { wiaCryptoContext }) => {
    // Verify JWT signature
    await verifyJwt(challengeInfoJwt, issuerConf.keys);

    // Decode JWT
    const challengeInfoDecoded = decodeJwt(challengeInfoJwt);

    // Parse and validate structure
    const challengeInfoParsed =
      MrtdProofChallengeInfoJwt.safeParse(challengeInfoDecoded);
    if (!challengeInfoParsed.success) {
      throw new IoWalletError("Malformed challenge info.");
    }
    const payload = challengeInfoParsed.data.payload;

    // Verify aud claim
    const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
    if (payload.aud !== clientId) {
      throw new IoWalletError("aud claim does not match client_id.");
    }

    // Verify iat and exp
    const now = Math.floor(Date.now() / 1000);
    if (payload.iat > now || payload.exp < now) {
      throw new IoWalletError(
        "JWT is not valid (issued in future or expired)."
      );
    }

    return payload;
  };
