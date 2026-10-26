import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { selectEudiCredentials } from "../../store/reducers/eudi/credentials";
import { selectEudiPresentationRequest } from "../../store/reducers/eudi/presentation";
import { selectEudiLotes } from "../../store/reducers/eudi/trust";
import { createAppAsyncThunk } from "../utils";

export interface StartEudiPresentationThunkInput {
  uri: string;
}

export interface StartEudiPresentationThunkOutput {
  /** The requested credentials, with the wallet ones that satisfy them, to choose before asking the user's consent */
  credentials: Eudi.RemotePresentation.EvaluatedCredentialQuery[];
  requestObject: Eudi.RemotePresentation.RequestObject;
  uri: string;
  /** The outcome of the Verifier trust evaluation with its WRPAC and WRPRC */
  verifierTrust: {
    error?: { message: string; name: string };
    isTrusted: boolean;
    /** The requested credentials and claims not registered in the Verifier WRPRC */
    unregisteredRequests?: Eudi.RemotePresentation.UnregisteredRequest[];
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
    throw new Error("Missing WRPAC and WRPRC providers lists");
  }

  const { clientId, requestObjectJwt, walletNonce } =
    await RemotePresentation.resolveRequestObject(uri);

  const { requestObject } = await RemotePresentation.verifyRequestObject(
    requestObjectJwt,
    { clientId, parsingOnly: true, walletNonce },
  );

  const verifierTrust = await RemotePresentation.evaluateVerifierTrust({
    requestObjectJwt,
    wrpacLote: lotes.EUWRPACProvidersList,
    wrprcLote: lotes.EUWRPRCProvidersList,
  });

  const credentials = await RemotePresentation.evaluateDcqlQuery(
    requestObject,
    selectEudiCredentials(getState()),
  );

  return { credentials, requestObject, uri, verifierTrust };
});

/** The credentials the user chose to present, one per requested credential, or the refusal of the user */
export type CompleteEudiPresentationThunkInput =
  | { consent: false }
  | {
      consent: true;
      credentials: Eudi.RemotePresentation.EvaluatedCredential[];
    };

/**
 * Thunk to complete the EUDI Wallet remote presentation started with {@link startEudiPresentationThunk}:
 * it presents the credentials when the user consents, otherwise it notifies the refusal to the Verifier.
 * @returns The Verifier response, with the `redirect_uri` to open, if any
 */
export const completeEudiPresentationThunk = createAppAsyncThunk<
  Eudi.RemotePresentation.AuthorizationResponseResult,
  CompleteEudiPresentationThunkInput
>("eudi/presentationComplete", async (input, { getState }) => {
  const { RemotePresentation } = Eudi;
  const request = selectEudiPresentationRequest(getState());
  if (!request) {
    throw new Error("No presentation request to complete");
  }

  return input.consent
    ? RemotePresentation.sendAuthorizationResponse(
        request.requestObject,
        input.credentials,
      )
    : RemotePresentation.sendAuthorizationErrorResponse(request.requestObject, {
        code: "access_denied",
        description: "The user refused to present the credentials",
      });
});
