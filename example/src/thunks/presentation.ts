import { createAppAsyncThunk } from "./utils";
import { IoWallet, RemotePresentation } from "@pagopa/io-react-native-wallet";
import type { PresentationStateKeys } from "../store/reducers/presentation";
import { selectPid } from "../store/reducers/pid";
import { selectCredentials } from "../store/reducers/credential";
import { isDefined } from "../utils/misc";
import { selectItwVersion } from "../store/reducers/environment";
import { ClientIdPrefix } from "@pagopa/io-wallet-oid4vp";

type DcqlQuery = Parameters<
  RemotePresentation.RemotePresentationApi["evaluateDcqlQuery"]
>[0];

export type RequestObject = RemotePresentation.RequestObject;

export type RemoteCrossDevicePresentationThunkInput = {
  qrcode: string;
  allowed: PresentationStateKeys;
};

export type RemoteCrossDevicePresentationThunkOutput = {
  authResponse: RemotePresentation.AuthorizationResponse;
  requestObject: RequestObject;
  requestedClaims: string[];
};

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
    request_uri: url.searchParams.get("request_uri"),
    client_id: url.searchParams.get("client_id"),
    state: url.searchParams.get("state"),
    request_uri_method: url.searchParams.get("request_uri_method") as
      | "get"
      | "post",
  });

  const rpUrl = qrParams.client_id.replace(
    `${ClientIdPrefix.OPENID_FEDERATION}:`,
    ""
  );

  const { rpConf } =
    await wallet.RemotePresentation.evaluateRelyingPartyTrust(rpUrl);

  const { requestObjectEncodedJwt } =
    await wallet.RemotePresentation.getRequestObject(args.qrcode);

  const { requestObject } = await wallet.RemotePresentation.verifyRequestObject(
    requestObjectEncodedJwt,
    {
      rpConf,
      clientId: qrParams.client_id,
      state: qrParams.state,
    }
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
  credentialsSdJwt: [string, string][]
) => {
  const evaluatedDcqlQuery = await wallet.RemotePresentation.evaluateDcqlQuery(
    requestObject.dcql_query as DcqlQuery,
    credentialsSdJwt
  );

  const authRequestObject = {
    nonce: requestObject.nonce,
    clientId: requestObject.client_id,
    responseUri: requestObject.response_uri,
  };

  const remotePresentations =
    await wallet.RemotePresentation.prepareRemotePresentations(
      evaluatedDcqlQuery,
      authRequestObject
    );

  const authResponse =
    await wallet.RemotePresentation.sendAuthorizationResponse(
      requestObject,
      remotePresentations,
      rpConf
    );

  return {
    authResponse,
    requestObject,
    requestedClaims: remotePresentations.presentations.flatMap(
      (c) => c.requestedClaims
    ),
  };
};

// Mock an error in the presentation flow
const processRefusedPresentation = async (
  wallet: IoWallet,
  requestObject: RequestObject
) => {
  const authResponse =
    await wallet.RemotePresentation.sendAuthorizationErrorResponse(
      requestObject,
      {
        error: "invalid_request_object",
        errorDescription: "Mock error during request object validation",
      }
    );
  return { authResponse, requestObject, requestedClaims: [] };
};
