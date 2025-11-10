import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import { selectPidFlowParams } from "../store/reducers/pid";
import { createAppAsyncThunk } from "./utils";
import appFetch from "../utils/fetch";
import { WIA_KEYTAG } from "../utils/crypto";

type InitPidMrtdChallengeInput = {
  authRedirectUrl: string;
};

type InitPidMrtdChallengeOutput = {
  challenge: string;
  mrtd_auth_session: string;
  mrtd_pop_nonce: string;
};

export const initPidMrtdChallengeThunk = createAppAsyncThunk<
  InitPidMrtdChallengeOutput,
  InitPidMrtdChallengeInput
>("mrtd/challengeInit", async (args, { getState }) => {
  const flowParams = selectPidFlowParams(getState());

  if (!flowParams) {
    throw new Error("Flow params not found");
  }

  const { authRedirectUrl } = args;
  const { issuerConf, walletInstanceAttestation } = flowParams;

  const { challenge_info } =
    await Credential.Issuance.completeUserAuthorizationWithDocumentProof(
      authRedirectUrl
    );

  const {
    htu: initUrl,
    mrtd_auth_session,
    mrtd_pop_jwt_nonce,
  } = Credential.MRTDPoP.verifyAndParseChallengeInfo(challenge_info);

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  const { challenge, mrtd_pop_nonce } = await Credential.MRTDPoP.initChallenge(
    issuerConf,
    initUrl,
    mrtd_auth_session,
    mrtd_pop_jwt_nonce,
    {
      walletInstanceAttestation,
      wiaCryptoContext,
      appFetch,
    }
  );

  return {
    challenge,
    mrtd_auth_session,
    mrtd_pop_nonce,
  };
});

type VerifyPidMrtdChallengeInput = {
  verifyUrl: string;
  mrtd_auth_session: string;
  mrtd_pop_nonce: string;
  mrtd: Credential.MRTDPoP.MrtdPayload;
  ias: Credential.MRTDPoP.IasPayload;
};

type VerifyPidMrtdChallengeOutput = {
  mrtd_val_pop_nonce: string;
  redirect_uri: string;
};

export const verifyPidMrtdChallengeThunk = createAppAsyncThunk<
  VerifyPidMrtdChallengeOutput,
  VerifyPidMrtdChallengeInput
>("mrtd/challengeVerify", async (args, { getState }) => {
  return {};
});
