import { useCallback } from "react";
import type { PidAuthMethods } from "../store/types";
import { useAppDispatch } from "../store/utils";
import { openUrlAndListenForAuthRedirect } from "../utils/openUrlAndListenForRedirect";
import { continuePidFlowThunk, preparePidFlowParamsThunk } from "../thunks/pid";

type UseCieId = (
  /**
   * IDP hint for the authentication flow.
   * This is used to prepare the PID flow parameters.
   */
  idpHint: string
) => {
  /**
   * Function to start the CieID identification process.
   */
  startCieIDIdentification: (authMetod: PidAuthMethods) => void;
};

export const useCieId: UseCieId = (idpHint) => {
  const dispatch = useAppDispatch();

  const startCieIDIdentification = useCallback(
    async (authMethod: PidAuthMethods) => {
      const { authUrl, redirectUri } = await dispatch(
        preparePidFlowParamsThunk({
          idpHint,
          authMethod,
        })
      ).unwrap();

      const { authRedirectUrl } = await openUrlAndListenForAuthRedirect(
        redirectUri,
        authUrl
      );

      dispatch(
        continuePidFlowThunk({
          authRedirectUrl,
        })
      );
    },
    [dispatch, idpHint]
  );

  return {
    startCieIDIdentification,
  };
};
