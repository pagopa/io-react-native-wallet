import { useCallback, useEffect, useRef } from "react";
import type { PidAuthMethods } from "../store/types";
import { useAppDispatch } from "../store/utils";
import { openUrlAndListenForAuthRedirect } from "../utils/openUrlAndListenForRedirect";
import { pidCiel3FlowReset } from "../store/reducers/pid";
import { continuePidFlowThunk, preparePidFlowParamsThunk } from "../thunks/pid";

type UseCieID = (
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

export const useCieID: UseCieID = (idpHint) => {
  const dispatch = useAppDispatch();
  const signal = useRef<AbortSignal>(new AbortSignal());

  useEffect(() => {
    if (!signal.current.aborted) {
      dispatch(pidCiel3FlowReset());
    }
  }, [dispatch, signal]);

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
        authUrl,
        signal.current
      );

      dispatch(
        continuePidFlowThunk({
          authRedirectUrl,
        })
      );
    },
    [dispatch, idpHint, signal]
  );

  return {
    startCieIDIdentification,
  };
};
