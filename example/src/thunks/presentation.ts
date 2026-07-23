import {
  IoWallet,
  type RemotePresentation,
} from "@pagopa/io-react-native-wallet";
import { ClientIdPrefix } from "@pagopa/io-wallet-oid4vp";

import type { PresentationStateKeys } from "../store/reducers/presentation";

import { selectCredentials } from "../store/reducers/credential";
import { selectItwVersion } from "../store/reducers/environment";
import { selectPid } from "../store/reducers/pid";
import { isDefined } from "../utils/misc";
import { createAppAsyncThunk } from "./utils";

export interface RemoteCrossDevicePresentationThunkInput {
  allowed: PresentationStateKeys;
  qrcode: string;
}

export interface RemoteCrossDevicePresentationThunkOutput {
  authResponse: RemotePresentation.AuthorizationResponse;
  requestedClaims: string[];
  requestObject: RequestObject;
}

export type RequestObject = RemotePresentation.RequestObject;

/**
 * Thunk to present credential.
 */
export const remoteCrossDevicePresentationThunk = createAppAsyncThunk<
  RemoteCrossDevicePresentationThunkOutput,
  RemoteCrossDevicePresentationThunkInput
>("presentation/remote", async (args, { getState }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  const url = new URL(args.qrcode);

  const qrParams = wallet.RemotePresentation.startFlowFromQR({
    client_id: url.searchParams.get("client_id"),
    request_uri: url.searchParams.get("request_uri"),
    request_uri_method: url.searchParams.get("request_uri_method") as
      | "get"
      | "post",
    state: url.searchParams.get("state"),
  });

  const rpUrl = qrParams.client_id.replace(
    `${ClientIdPrefix.OPENID_FEDERATION}:`,
    "",
  );

  const { rpConf } =
    await wallet.RemotePresentation.evaluateRelyingPartyTrust(rpUrl);

  const { requestObjectEncodedJwt } =
    await wallet.RemotePresentation.getRequestObject(args.qrcode);

  const { requestObject } = await wallet.RemotePresentation.verifyRequestObject(
    requestObjectEncodedJwt,
    {
      clientId: qrParams.client_id,
      rpConf,
      state: qrParams.state,
    },
  );

  const pid = selectPid(getState());
  if (!pid) {
    throw new Error("PID not found");
  }

  const credentials = selectCredentials(getState());

  const credentialsSdJwt = [
    [pid.keyTag, pid.credential],
    ...Object.values(credentials)
      .filter(isDefined)
      .map((c) => [c.keyTag, c.credential]),
  ] as [string, string][];

  if (requestObject.dcql_query && args.allowed === "refusalState") {
    return processRefusedPresentation(wallet, requestObject);
  }

  return processPresentation(wallet, requestObject, rpConf, credentialsSdJwt);
});

// DCQL flow
const processPresentation = async (
  wallet: IoWallet,
  requestObject: RequestObject,
  rpConf: RemotePresentation.RelyingPartyConfig,
  credentialsSdJwt: [string, string][],
) => {
  const evaluatedDcqlQuery = await wallet.RemotePresentation.evaluateDcqlQuery(
    requestObject.dcql_query as RemotePresentation.DcqlQuery,
    credentialsSdJwt,
  );

  const authRequestObject = {
    clientId: requestObject.client_id,
    nonce: requestObject.nonce,
    responseUri: requestObject.response_uri,
  };

  const remotePresentations =
    await wallet.RemotePresentation.prepareRemotePresentations(
      evaluatedDcqlQuery,
      authRequestObject,
    );

  const authResponse =
    await wallet.RemotePresentation.sendAuthorizationResponse(
      requestObject,
      remotePresentations,
      rpConf,
    );

  return {
    authResponse,
    requestedClaims: remotePresentations.presentations.flatMap(
      (c) => c.requestedClaims,
    ),
    requestObject,
  };
};

// Mock an error in the presentation flow
const processRefusedPresentation = async (
  wallet: IoWallet,
  requestObject: RequestObject,
) => {
  const authResponse =
    await wallet.RemotePresentation.sendAuthorizationErrorResponse(
      requestObject,
      {
        error: "invalid_request_object",
        errorDescription: "Mock error during request object validation",
      },
    );
  return { authResponse, requestedClaims: [], requestObject };
};
