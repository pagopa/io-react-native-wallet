import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { MrtdProofChallengeInfo } from "./types";

export type VerifyAndParseChallengeInfo = (
  challengeInfoJwt: string
) => Promise<{
  htu: string;
  htm: string;
  mrtd_auth_session: string;
  state: string;
  mrtd_pop_jwt_nonce: string;
}>;

export const verifyAndParseChallengeInfo: VerifyAndParseChallengeInfo = async (
  challengeInfoJwt: string
) => {
  const challengeInfoDecoded = decodeJwt(challengeInfoJwt);
  const { header, payload } =
    MrtdProofChallengeInfo.parse(challengeInfoDecoded);
  const { htu, htm, mrtd_auth_session, state, mrtd_pop_jwt_nonce } = payload;

  return { htu, htm, mrtd_auth_session, state, mrtd_pop_jwt_nonce };
};
