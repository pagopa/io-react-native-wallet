import { createAppAsyncThunk } from "./utils";
import {
  createCryptoContextFor,
  IoWallet,
  RemotePresentation,
} from "@pagopa/io-react-native-wallet";
import {
  selectAttestationAsSdJwt,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { getAttestationThunk } from "./attestation";
import type { PresentationStateKeys } from "../store/reducers/presentation";
import { selectPid } from "../store/reducers/pid";
import { selectCredentials } from "../store/reducers/credential";
import { isDefined } from "../utils/misc";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { WIA_KEYTAG } from "../utils/crypto";
import { selectItwVersion } from "../store/reducers/environment";

type DcqlQuery = Parameters<
  RemotePresentation.RemotePresentationApi["evaluateDcqlQuery"]
>[1];

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
>("presentation/remote", async (args, { getState, dispatch }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  // Checks if the wallet instance attestation needs to be requested
  if (shouldRequestAttestationSelector(getState())) {
    await dispatch(getAttestationThunk());
  }

  const url = new URL(args.qrcode);

  const qrParams = wallet.RemotePresentation.startFlowFromQR({
    request_uri: url.searchParams.get("request_uri"),
    client_id: url.searchParams.get("client_id"),
    state: url.searchParams.get("state"),
    request_uri_method: url.searchParams.get("request_uri_method") as
      | "get"
      | "post",
  });

  const { rpConf } = await wallet.RemotePresentation.evaluateRelyingPartyTrust(
    qrParams.client_id
  );

  const { requestObjectEncodedJwt } =
    await wallet.RemotePresentation.getRequestObject(qrParams.request_uri);

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

  const walletInstanceAttestation = selectAttestationAsSdJwt(getState());
  if (!walletInstanceAttestation) {
    throw new Error("Wallet Instance Attestation not found");
  }

  const credentials = selectCredentials(getState());

  const credentialsSdJwt = [
    [createCryptoContextFor(pid.keyTag), pid.credential],
    [createCryptoContextFor(WIA_KEYTAG), walletInstanceAttestation],
    ...Object.values(credentials)
      .filter(isDefined)
      .map((c) => [createCryptoContextFor(c.keyTag), c.credential]),
  ] as [CryptoContext, string][];

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
  credentialsSdJwt: [CryptoContext, string][]
) => {
  const result = wallet.RemotePresentation.evaluateDcqlQuery(
    credentialsSdJwt,
    requestObject.dcql_query as DcqlQuery
  );

  const credentialsToPresent = result.map(
    ({ requiredDisclosures, ...rest }) => ({
      ...rest,
      requestedClaims: requiredDisclosures.map(([, claimName]) => claimName),
    })
  );

  const remotePresentations =
    await wallet.RemotePresentation.prepareRemotePresentations(
      credentialsToPresent,
      requestObject
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
    requestedClaims: credentialsToPresent.flatMap((c) => c.requestedClaims),
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
