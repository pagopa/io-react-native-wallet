import { createAppAsyncThunk } from "./utils";
import { Credential } from "@pagopa/io-react-native-wallet";
import type { PresentationStateKeys } from "../store/reducers/presentation";
import { selectPidSdJwt } from "../store/reducers/pid";
import { selectCredentials } from "../store/reducers/credential";
import { isDefined } from "../utils/misc";
import type { RootState } from "../store/types";
import { shouldRequestAttestationSelector } from "../store/reducers/attestation";
import { getAttestationThunk } from "./attestation";

export type RequestObject = Awaited<
  ReturnType<Credential.Presentation.VerifyRequestObject>
>["requestObject"];
type DcqlQuery = Parameters<Credential.Presentation.EvaluateDcqlQuery>[0];
type RpConf = Awaited<
  ReturnType<Credential.Presentation.EvaluateRelyingPartyTrust>
>["rpConf"];
type JwksKeys = Awaited<
  ReturnType<typeof Credential.Presentation.getJwksFromConfig>
>["keys"];
type AuthResponse = Awaited<
  ReturnType<Credential.Presentation.SendAuthorizationResponse>
>;
type QrCodeParams = ReturnType<Credential.Presentation.StartFlow>;

export type RemoteCrossDevicePresentationThunkInput = {
  qrcode: string;
  allowed: PresentationStateKeys;
};

export type RemoteCrossDevicePresentationThunkOutput = {
  authResponse: AuthResponse;
};

/**
 * Thunk to present credential.
 */
export const remoteCrossDevicePresentationThunk = createAppAsyncThunk<
  RemoteCrossDevicePresentationThunkOutput,
  RemoteCrossDevicePresentationThunkInput
>("presentation/remote", async (args, { getState, dispatch }) => {
  // Checks if the wallet instance attestation needs to be requested
  if (shouldRequestAttestationSelector(getState())) {
    await dispatch(getAttestationThunk());
  }

  const url = new URL(args.qrcode);

  const qrParams = Credential.Presentation.startFlowFromQR({
    request_uri: url.searchParams.get("request_uri"),
    client_id: url.searchParams.get("client_id"),
    state: url.searchParams.get("state"),
    request_uri_method: url.searchParams.get("request_uri_method") as
      | "get"
      | "post",
  });

  const [clientIdPrefix] = qrParams.client_id.split(":");
  const handleAuthRequest = clientIdPrefix
    ? handleAuthRequestByClientId[clientIdPrefix]
    : undefined;

  if (!handleAuthRequest) {
    throw new Error(`Unrecognized client_id: ${clientIdPrefix}`);
  }

  const { requestObject, keys } = await handleAuthRequest(qrParams);

  const { credentialsSdJwt, credentialsMdoc } =
    getCredentialsForPresentation(getState());

  if (args.allowed === "refusalState") {
    return processRefusedPresentation(requestObject);
  }

  const evaluatedDcqlQuery = await Credential.Presentation.evaluateDcqlQuery(
    requestObject.dcql_query as DcqlQuery,
    credentialsSdJwt,
    credentialsMdoc
  );
  const credentialsToPresent = evaluatedDcqlQuery.map(
    ({ requiredDisclosures, id, ...rest }) => ({
      ...rest,
      credentialInputId: id,
      requestedClaims: requiredDisclosures,
    })
  );

  const authRequestObject = {
    nonce: requestObject.nonce,
    clientId: requestObject.client_id,
    responseUri: requestObject.response_uri,
  };

  const remotePresentations =
    await Credential.Presentation.prepareRemotePresentations(
      credentialsToPresent,
      authRequestObject
    );

  const authResponse = await Credential.Presentation.sendAuthorizationResponse(
    requestObject,
    keys,
    remotePresentations
  );

  return {
    authResponse,
  };
});

type HandleAuthRequest = (qrParams: QrCodeParams) => Promise<{
  requestObject: RequestObject;
  keys: JwksKeys;
  rpConf?: RpConf;
}>;

/**
 * Handle the Authentication Request for clients with `openid_federation` prefix.
 * @param qrParams The QR code
 * @returns Request Object, JWKS, Verifier's EC
 */
const handleAuthRequestForOpenIdFederation: HandleAuthRequest = async (
  qrParams
) => {
  const [, entityId] = qrParams.client_id.split(":");
  console.log("openid_federation", entityId);

  const { rpConf, subject } =
    await Credential.Presentation.evaluateRelyingPartyTrust(entityId!);

  if (entityId !== subject) {
    throw new Error("The client ID must match the Entity Configuration's sub");
  }

  const { keys } = await Credential.Presentation.getJwksFromConfig(rpConf);

  const { requestObjectEncodedJwt } =
    await Credential.Presentation.getRequestObject(qrParams.request_uri);

  const { requestObject } = await Credential.Presentation.verifyRequestObject(
    requestObjectEncodedJwt,
    keys
  );

  return { requestObject, keys, rpConf };
};

/**
 * Handle the Authentication Request for clients with `x509_hash` prefix.
 * @param qrParams The QR code
 * @returns Request Object, JWKS
 */
const handleAuthRequestForX509Hash: HandleAuthRequest = async (qrParams) => {
  const [, x509Hash] = qrParams.client_id.split(":");
  console.log("x509_hash", x509Hash);

  const { requestObjectEncodedJwt } =
    await Credential.Presentation.getRequestObject(qrParams.request_uri);

  const { keys } = await Credential.Presentation.fetchJwksFromRequestObject(
    requestObjectEncodedJwt
  );

  const { requestObject } = await Credential.Presentation.verifyRequestObject(
    requestObjectEncodedJwt,
    keys,
    { x509Hash }
  );

  return { requestObject, keys };
};

const handleAuthRequestByClientId: Record<string, HandleAuthRequest> = {
  x509_hash: handleAuthRequestForX509Hash,
  openid_federation: handleAuthRequestForOpenIdFederation,
};

// Mock an error in the presentation flow
const processRefusedPresentation = async (requestObject: RequestObject) => {
  const authResponse =
    await Credential.Presentation.sendAuthorizationErrorResponse(
      requestObject,
      {
        error: "invalid_request_object",
        errorDescription: "Mock error during request object validation",
      }
    );
  return { authResponse };
};

const getCredentialsForPresentation = (state: RootState) => {
  const pid = selectPidSdJwt(state);
  const credentials = selectCredentials(state);
  const allCredentials = Object.values({ pid, ...credentials }).filter(
    isDefined
  );

  const credentialsSdJwt: [string, string][] = [];
  const credentialsMdoc: [string, string][] = [];

  for (const c of allCredentials) {
    const destination =
      c.format === "dc+sd-jwt" ? credentialsSdJwt : credentialsMdoc;
    destination.push([c.keyTag, c.credential]);
  }

  return {
    credentialsSdJwt,
    credentialsMdoc,
  };
};
