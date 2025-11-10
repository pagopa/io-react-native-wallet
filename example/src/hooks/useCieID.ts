import { useCallback } from "react";
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
  startCieIDIdentification: (withMRTDPoP?: boolean) => void;
};

export const useCieId: UseCieId = (idpHint) => {
  const dispatch = useAppDispatch();

  const startCieIDIdentification = useCallback(
    async (withMRTDPoP: boolean = false) => {
      const { authUrl, redirectUri } = await dispatch(
        preparePidFlowParamsThunk({
          idpHint,
          authMethod: "cieL2",
          withMRTDPoP,
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
