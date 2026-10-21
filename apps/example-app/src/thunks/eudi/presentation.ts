import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { selectEudiCredentials } from "../../store/reducers/eudi/credentials";
import { selectEudiPresentationRequest } from "../../store/reducers/eudi/presentation";
import { selectEudiLotes } from "../../store/reducers/eudi/trust";
import { createAppAsyncThunk } from "../utils";

export interface StartEudiPresentationThunkInput {
  uri: string;
}

export interface StartEudiPresentationThunkOutput {
  /** The wallet credentials that satisfy the request, to show before asking the user's consent */
  credentials: Eudi.RemotePresentation.EvaluatedCredential[];
  requestObject: Eudi.RemotePresentation.RequestObject;
  uri: string;
  /** The outcome of the Verifier trust evaluation with its WRPAC and WRPRC */
  verifierTrust: {
    error?: { message: string; name: string };
    isTrusted: boolean;
  };
}

/**
 * Thunk to start an EUDI Wallet remote presentation (OpenID4VP 1.0 with the HAIP profile),
 * separate from the IT-Wallet one: it verifies the request of the Verifier and finds the
 * credentials that satisfy it. The plain fetch is used since the requests are not directed
 * to the IO backend.
 */
export const startEudiPresentationThunk = createAppAsyncThunk<
  StartEudiPresentationThunkOutput,
  StartEudiPresentationThunkInput
>("eudi/presentationStart", async ({ uri }, { getState }) => {
  const { RemotePresentation } = Eudi;
  const lotes = selectEudiLotes(getState());

  if (!lotes.EUWRPACProvidersList || !lotes.EUWRPRCProvidersList) {
    throw new Error(
      "A WRPAC providers LoTE is necessary to authenticate the Verifier",
    );
  }

  const { clientId, requestObjectJwt, walletNonce } =
    await RemotePresentation.resolveRequestObject(uri);

  const { requestObject } = await RemotePresentation.verifyRequestObject(
    requestObjectJwt,
    { clientId, walletNonce, parsingOnly: true },
  );

  const verifierTrust = await RemotePresentation.evaluateVerifierTrust({
    requestObjectJwt,
    wrpacLote: lotes.EUWRPACProvidersList,
    wrprcLote: lotes.EUWRPRCProvidersList
  })

  const credentials = await RemotePresentation.evaluateDcqlQuery(
    requestObject,
    selectEudiCredentials(getState()),
  );

  return { credentials, requestObject, uri, verifierTrust };
});

export interface CompleteEudiPresentationThunkInput {
  /** Whether the user consented to present the requested credentials */
  consent: boolean;
}

/**
 * Thunk to complete the EUDI Wallet remote presentation started with {@link startEudiPresentationThunk}:
 * it presents the credentials when the user consents, otherwise it notifies the refusal to the Verifier.
 * @returns The Verifier response, with the `redirect_uri` to open, if any
 */
export const completeEudiPresentationThunk = createAppAsyncThunk<
  Eudi.RemotePresentation.AuthorizationResponseResult,
  CompleteEudiPresentationThunkInput
>("eudi/presentationComplete", async ({ consent }, { getState }) => {
  const { RemotePresentation } = Eudi;
  const request = selectEudiPresentationRequest(getState());
  if (!request) {
    throw new Error("No presentation request to complete");
  }

  return consent
    ? RemotePresentation.sendAuthorizationResponse(
        request.requestObject,
        request.credentials,
      )
    : RemotePresentation.sendAuthorizationErrorResponse(request.requestObject, {
        code: "access_denied",
        description: "The user refused to present the credentials",
      });
});
