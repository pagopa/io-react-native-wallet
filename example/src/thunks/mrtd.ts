import {
  createCryptoContextFor,
  CredentialIssuance,
  IoWallet,
} from "@pagopa/io-react-native-wallet";

import { selectItwVersion } from "../store/reducers/environment";
import { selectMrtdFlowParams } from "../store/reducers/mrtd";
import { selectPidFlowParams } from "../store/reducers/pid";
import { WIA_KEYTAG } from "../utils/crypto";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";

export interface InitPidMrtdChallengeOutput {
  challenge: string;
  mrtd_auth_session: string;
  mrtd_pop_nonce: string;
  validationUrl: string;
}

export interface VerifyPidMrtdChallengeOutput {
  callbackUrl: string;
}

interface InitPidMrtdChallengeInput {
  authRedirectUrl: string;
}

interface VerifyPidMrtdChallengeInput {
  ias: CredentialIssuance.MRTDPoP.IasPayload;
  mrtd: CredentialIssuance.MRTDPoP.MrtdPayload;
}

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
      authRedirectUrl,
    );

  const {
    htu: initUrl,
    mrtd_auth_session,
    mrtd_pop_jwt_nonce,
  } = await wallet.CredentialIssuance.MRTDPoP.verifyAndParseChallengeInfo(
    issuerConf,
    challenge_info,
    { wiaCryptoContext },
  );

  const { challenge, mrtd_pop_nonce, pop_verify_endpoint } =
    await wallet.CredentialIssuance.MRTDPoP.initChallenge(
      issuerConf,
      initUrl,
      mrtd_auth_session,
      mrtd_pop_jwt_nonce,
      {
        appFetch,
        walletInstanceAttestation,
        wiaCryptoContext,
      },
    );

  return {
    challenge,
    mrtd_auth_session,
    mrtd_pop_nonce,
    validationUrl: pop_verify_endpoint,
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
  const { mrtd_auth_session, mrtd_pop_nonce, validationUrl } = mrtdFlowParams;

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
        appFetch,
        walletInstanceAttestation,
        wiaCryptoContext,
      },
    );

  const { callbackUrl } =
    await wallet.CredentialIssuance.MRTDPoP.buildChallengeCallbackUrl(
      redirect_uri,
      mrtd_val_pop_nonce,
      mrtd_auth_session,
    );

  return {
    callbackUrl,
  };
});
