import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { MrtdProofChallengeInfo } from "./types";

export type VerifyAndParseChallengeInfo = (
  challengeInfoJwt: string
) => MrtdProofChallengeInfo["payload"];

export const verifyAndParseChallengeInfo: VerifyAndParseChallengeInfo = (
  challengeInfoJwt: string
) => {
  const challengeInfoDecoded = decodeJwt(challengeInfoJwt);

  const challengeInfoParsed =
    MrtdProofChallengeInfo.safeParse(challengeInfoDecoded);

  if (!challengeInfoParsed.success) {
    throw new Error("");
  }

  return challengeInfoParsed.data.payload;
};
