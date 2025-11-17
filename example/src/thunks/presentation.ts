import { createAppAsyncThunk } from "./utils";
import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import {
  selectAttestationAsSdJwt,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { getAttestationThunk } from "./attestation";
import type { PresentationStateKeys } from "../store/reducers/presentation";
import { selectPidSdJwt } from "../store/reducers/pid";
import { selectCredentials } from "../store/reducers/credential";
import { isDefined } from "../utils/misc";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { WIA_KEYTAG } from "../utils/crypto";
import type { EvaluatedDisclosures } from "src/credential/presentation/07-evaluate-input-descriptor";

export type RequestObject = Awaited<
  ReturnType<Credential.Presentation.VerifyRequestObject>
>["requestObject"];
type DcqlQuery = Parameters<Credential.Presentation.EvaluateDcqlQuery>[0];
type RpConf = Awaited<
  ReturnType<Credential.Presentation.EvaluateRelyingPartyTrust>
>["rpConf"];
type AuthResponse = Awaited<
  ReturnType<Credential.Presentation.SendAuthorizationResponseDcql>
>;
export type CredentialsToPresent = Awaited<
  ReturnType<Credential.Presentation.EvaluateDcqlQuery>
>;

export type RemoteCrossDevicePresentationThunkInput = {
  qrcode: string;
  allowed: PresentationStateKeys;
};

export type RemoteCrossDevicePresentationThunkOutput = {
  authResponse: AuthResponse;
  requestObject: RequestObject;
  credentialsToPresent: CredentialsToPresent;
};

/**
 * Thunk to present credential.
 */
export const remoteCrossDevicePresentationThunk = createAppAsyncThunk<
  RemoteCrossDevicePresentationThunkOutput,
  RemoteCrossDevicePresentationThunkInput
>("presentation/remote", async (args, { getState, dispatch }) => {
  const url = new URL(args.qrcode);

  const qrParams = Credential.Presentation.startFlowFromQR({
    request_uri: url.searchParams.get("request_uri"),
    client_id: url.searchParams.get("client_id"),
    state: url.searchParams.get("state"),
    request_uri_method: url.searchParams.get("request_uri_method") as
      | "get"
      | "post",
  });

  if (qrParams.client_id.startsWith("x509_hash:")) {
    const [, hash] = qrParams.client_id.split(":");
    console.log("x509_hash", hash);
  }

  /* if (qrParams.client_id.startsWith("openid_federation:")) {
    const [, entityId] = qrParams.client_id.split(":");
    console.log("openid_federation", entityId);

    const { rpConf } = await Credential.Presentation.evaluateRelyingPartyTrust(
      entityId!
    );

    const { keys } = await Credential.Presentation.getJwksFromConfig(rpConf);
  } */

  const { requestObjectEncodedJwt } =
    await Credential.Presentation.getRequestObject(qrParams.request_uri);

  const { keys } = await Credential.Presentation.fetchJwksFromRequestObject(
    requestObjectEncodedJwt
  );

  const { requestObject } = await Credential.Presentation.verifyRequestObject(
    requestObjectEncodedJwt,
    {
      clientId: qrParams.client_id,
      jwkKeys: keys,
    }
  );

  const pid = selectPidSdJwt(getState());
  const credentials = selectCredentials(getState());

  const credentialsSdJwt = [
    ...Object.values({ pid, ...credentials })
      .filter(isDefined)
      .map((c) => [c.credentialType, c.keyTag, c.credential]),
  ] as [string, string, string][];

  if (args.allowed === "refusalState") {
    return processRefusedPresentation(requestObject);
  }

  const evaluatedDcqlQuery = await Credential.Presentation.evaluateDcqlQuery(
    requestObject.dcql_query as DcqlQuery,
    credentialsSdJwt
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

  const authResponse =
    await Credential.Presentation.sendAuthorizationResponseDcql(
      requestObject,
      keys,
      remotePresentations
    );

  return {
    authResponse,
    requestObject,
    credentialsToPresent: evaluatedDcqlQuery,
  };
});

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
  return { authResponse, requestObject, credentialsToPresent: [] };
};
