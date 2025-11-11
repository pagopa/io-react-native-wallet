import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import { selectPidFlowParams } from "../store/reducers/pid";
import { createAppAsyncThunk } from "./utils";
import appFetch from "../utils/fetch";
import { WIA_KEYTAG } from "../utils/crypto";
import { selectMrtdFlowParams } from "../store/reducers/mrtd";

type InitPidMrtdChallengeInput = {
  authRedirectUrl: string;
};

type InitPidMrtdChallengeOutput = {
  challenge: string;
  mrtd_auth_session: string;
  mrtd_pop_nonce: string;
  verifyUrl: string;
};

type VerifyPidMrtdChallengeInput = {
  mrtd: Credential.Issuance.MRTDPoP.MrtdPayload;
  ias: Credential.Issuance.MRTDPoP.IasPayload;
};

type VerifyPidMrtdChallengeOutput = {
  mrtd_val_pop_nonce: string;
  redirect_uri: string;
};

export const initPidMrtdChallengeThunk = createAppAsyncThunk<
  InitPidMrtdChallengeOutput,
  InitPidMrtdChallengeInput
>("mrtd/challengeInit", async (args, { getState }) => {
  const pidFlowParams = selectPidFlowParams(getState());

  if (!pidFlowParams) {
    throw new Error("PID flow params not found");
  }

  const { authRedirectUrl } = args;
  const { issuerConf, walletInstanceAttestation } = pidFlowParams;

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  const { challenge_info } =
    await Credential.Issuance.continueUserAuthorizationWithMRTDPoPChallenge(
      authRedirectUrl
    );

  const {
    htu: initUrl,
    mrtd_auth_session,
    mrtd_pop_jwt_nonce,
  } = await Credential.Issuance.MRTDPoP.verifyAndParseChallengeInfo(
    issuerConf,
    challenge_info,
    { wiaCryptoContext }
  );

  const { challenge, mrtd_pop_nonce, htu } =
    await Credential.Issuance.MRTDPoP.initChallenge(
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
    verifyUrl: htu,
  };
});

export const validatePidMrtdChallengeThunk = createAppAsyncThunk<
  VerifyPidMrtdChallengeOutput,
  VerifyPidMrtdChallengeInput
>("mrtd/challengeValidation", async (args, { getState }) => {
  const pidFlowParams = selectPidFlowParams(getState());

  if (!pidFlowParams) {
    throw new Error("PID flow params not found");
  }

  const mrtdFlowParams = selectMrtdFlowParams(getState());

  if (!mrtdFlowParams) {
    throw new Error("MRTD flow params not found");
  }

  const { ias, mrtd } = args;
  const { issuerConf, walletInstanceAttestation } = pidFlowParams;
  const { verifyUrl, mrtd_auth_session, mrtd_pop_nonce } = mrtdFlowParams;

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  const { mrtd_val_pop_nonce, redirect_uri } =
    await Credential.Issuance.MRTDPoP.validateChallenge(
      issuerConf,
      verifyUrl,
      mrtd_auth_session,
      mrtd_pop_nonce,
      mrtd,
      ias,
      {
        walletInstanceAttestation,
        wiaCryptoContext,
        appFetch,
      }
    );

  return {
    mrtd_val_pop_nonce,
    redirect_uri,
  };
});
