import { selectEnv } from "../store/reducers/environment";
import type { PidAuthMethods } from "../store/types";
import { getEnv } from "../utils/environment";
import { openUrlAndListenForAuthRedirect } from "../utils/openUrlAndListenForRedirect";
import { initPidMrtdChallengeThunk } from "./mrtd";
import { continuePidFlowThunk, preparePidFlowParamsThunk } from "./pid";
import { createAppAsyncThunk } from "./utils";

/**
 * Type definition for the input of the {@link getCredentialThunk}.
 */
type GetPidThunkInput = {
  idpHint: string;
  authMethod: PidAuthMethods;
  withMRTDPoP?: boolean;
};

/**
 * Thunk to obtain PID with CieID auth method.
 * @param args.idpHint- The idpHint for the Identity Provider to use if the requested credential is a `PersonIdentificationData`
 */
export const getPidCieIDThunk = createAppAsyncThunk<void, GetPidThunkInput>(
  "cieID/pidGet",
  async (args, { getState, dispatch }) => {
    const env = selectEnv(getState());
    const { REDIRECT_URI } = getEnv(env);

    // Ensure PID flow params are stored before proceed
    const { authUrl } = await dispatch(
      preparePidFlowParamsThunk(args)
    ).unwrap();

    // Open the authorization URL and listen for the redirect
    const { authRedirectUrl } = await openUrlAndListenForAuthRedirect(
      REDIRECT_URI,
      authUrl
    );

    // Continue with the flow depending on whether MRTD PoP is requested
    if (args.withMRTDPoP) {
      dispatch(
        initPidMrtdChallengeThunk({
          authRedirectUrl,
        })
      );
    } else {
      dispatch(
        continuePidFlowThunk({
          authRedirectUrl,
        })
      );
    }
  }
);
