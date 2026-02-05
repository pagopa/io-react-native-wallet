import {
  createCryptoContextFor,
  CredentialIssuance,
  IoWallet,
} from "@pagopa/io-react-native-wallet";
import { selectPidFlowParams } from "../store/reducers/pid";
import { createAppAsyncThunk } from "./utils";
import appFetch from "../utils/fetch";
import { WIA_KEYTAG } from "../utils/crypto";
import { selectMrtdFlowParams } from "../store/reducers/mrtd";
import { selectItwVersion } from "../store/reducers/environment";

type InitPidMrtdChallengeInput = {
  authRedirectUrl: string;
};

export type InitPidMrtdChallengeOutput = {
  challenge: string;
  mrtd_auth_session: string;
  mrtd_pop_nonce: string;
  validationUrl: string;
};

type VerifyPidMrtdChallengeInput = {
  mrtd: CredentialIssuance.MRTDPoP.MrtdPayload;
  ias: CredentialIssuance.MRTDPoP.IasPayload;
};

export type VerifyPidMrtdChallengeOutput = {
  callbackUrl: string;
};

export const initPidMrtdChallengeThunk = createAppAsyncThunk<
  InitPidMrtdChallengeOutput,
  InitPidMrtdChallengeInput
>("mrtd/challengeInit", async (args, { getState }) => {
  const pidFlowParams = selectPidFlowParams(getState());
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  if (!pidFlowParams) {
    throw new Error("PID flow params not found");
  }

  const { authRedirectUrl } = args;
  const { issuerConf, walletInstanceAttestation } = pidFlowParams;

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  const { challenge_info } =
    await wallet.CredentialIssuance.continueUserAuthorizationWithMRTDPoPChallenge(
      authRedirectUrl
    );

  const {
    htu: initUrl,
    mrtd_auth_session,
    mrtd_pop_jwt_nonce,
  } = await wallet.CredentialIssuance.MRTDPoP.verifyAndParseChallengeInfo(
    issuerConf,
    challenge_info,
    { wiaCryptoContext }
  );

  const {
    htu: validationUrl,
    challenge,
    mrtd_pop_nonce,
  } = await wallet.CredentialIssuance.MRTDPoP.initChallenge(
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
    validationUrl,
  };
});

export const validatePidMrtdChallengeThunk = createAppAsyncThunk<
  VerifyPidMrtdChallengeOutput,
  VerifyPidMrtdChallengeInput
>("mrtd/challengeValidation", async (args, { getState }) => {
  const pidFlowParams = selectPidFlowParams(getState());
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  if (!pidFlowParams) {
    throw new Error("PID flow params not found");
  }

  const mrtdFlowParams = selectMrtdFlowParams(getState());

  if (!mrtdFlowParams) {
    throw new Error("MRTD flow params not found");
  }

  const { ias, mrtd } = args;
  const { issuerConf, walletInstanceAttestation } = pidFlowParams;
  const { validationUrl, mrtd_auth_session, mrtd_pop_nonce } = mrtdFlowParams;

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  const { mrtd_val_pop_nonce, redirect_uri } =
    await wallet.CredentialIssuance.MRTDPoP.validateChallenge(
      issuerConf,
      validationUrl,
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

  const { callbackUrl } =
    await wallet.CredentialIssuance.MRTDPoP.buildChallengeCallbackUrl(
      redirect_uri,
      mrtd_val_pop_nonce,
      mrtd_auth_session
    );

  return {
    callbackUrl,
  };
});
