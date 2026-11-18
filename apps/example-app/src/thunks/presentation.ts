import {
  IoWallet,
  type RemotePresentation,
  type Signer,
} from "@io-app-it-wallet/io-react-native-wallet";
import {
  ClientIdPrefix,
  extractClientIdPrefix,
} from "@pagopa/io-wallet-oid4vp";

import type { PresentationStateKeys } from "../store/reducers/presentation";

import { selectCredentials } from "../store/reducers/credential";
import { selectXUserId } from "../store/reducers/user";
import { selectPid } from "../store/selectors/pid";
import {
  createLocalSignerFor,
  localMdocDeviceResponseGenerator,
} from "../utils/crypto";
import { getEnv, ITW_VERSION } from "../utils/environment";
import { isDefined } from "../utils/misc";
import { requestRemotePin } from "../utils/pinPrompt";
import { createRemoteSignerFor } from "../utils/remoteCrypto";
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
  const wallet = new IoWallet({ version: ITW_VERSION });

  const url = new URL(args.qrcode);

  const qrParams = wallet.RemotePresentation.startFlowFromQR({
    client_id: url.searchParams.get("client_id"),
    request_uri: url.searchParams.get("request_uri"),
    request_uri_method: url.searchParams.get("request_uri_method") as
      | "get"
      | "post",
    state: url.searchParams.get("state"),
  });

  const { clientId, prefix } = extractClientIdPrefix(qrParams.client_id);
  const rpConf =
    prefix === ClientIdPrefix.OPENID_FEDERATION ||
    prefix === ClientIdPrefix.NONE
      ? (await wallet.RemotePresentation.evaluateRelyingPartyTrust(clientId))
          .rpConf
      : undefined;

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

  // The PID key lives on the Remote WSCD, the keys of the other credentials on the device
  const pidSigner = createRemoteSignerFor(
    pid.remoteKey,
    await requestRemotePin(),
    {
      walletProviderBaseUrl: getEnv().WALLET_PROVIDER_BASE_URL,
      xUserId: selectXUserId(getState()),
    },
  );
  const credentialsSdJwt = [
    [pidSigner, pid.credential] as [Signer, string],
    ...Object.values(credentials)
      .filter(isDefined)
      .filter((c) => c.format === "dc+sd-jwt")
      .map((c): [Signer, string] => [
        createLocalSignerFor(c.keyTag),
        c.credential,
      ]),
  ];

  if (requestObject.dcql_query && args.allowed === "refusalState") {
    return processRefusedPresentation(wallet, requestObject);
  }

  return processPresentation(wallet, requestObject, rpConf, credentialsSdJwt);
});

// DCQL flow
const processPresentation = async (
  wallet: IoWallet,
  requestObject: RequestObject,
  rpConf: RemotePresentation.RelyingPartyConfig | undefined,
  credentialsSdJwt: [Signer, string][],
) => {
  const evaluatedDcqlQuery = await wallet.RemotePresentation.evaluateDcqlQuery(
    requestObject.dcql_query as RemotePresentation.DcqlQuery,
    credentialsSdJwt,
  );

  const remotePresentations =
    await wallet.RemotePresentation.prepareRemotePresentations(
      evaluatedDcqlQuery,
      requestObject,
      rpConf,
      { mdocDeviceResponseGenerator: localMdocDeviceResponseGenerator },
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
