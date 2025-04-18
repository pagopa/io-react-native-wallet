import { createAppAsyncThunk } from "./utils";
import { Credential } from "@pagopa/io-react-native-wallet";
import {
  selectAttestation,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { getAttestationThunk } from "./attestation";
import type { PresentationStateKeys } from "../store/reducers/presentation";
import { selectPid } from "../store/reducers/pid";
import { selectCredentials } from "../store/reducers/credential";
import { isDefined } from "../utils/misc";

export type RequestObject = Awaited<
  ReturnType<Credential.Presentation.VerifyRequestObject>
>["requestObject"];
type DcqlQuery = Parameters<Credential.Presentation.EvaluateDcqlQuery>[1];
type RpConf = Awaited<
  ReturnType<Credential.Presentation.EvaluateRelyingPartyTrust>
>["rpConf"];
type AuthResponse = Awaited<
  ReturnType<Credential.Presentation.SendAuthorizationResponse>
>;

/**
 * Type of the function to process the presentation request,
 * either when it uses DCQL queries or the legacy `presentation_definition`.
 */
type ProcessPresentation = (
  requestObject: RequestObject,
  rpConf: RpConf,
  credentialsSdJwt: [string, string][]
) => Promise<RemoteCrossDevicePresentationThunkOutput>;

export type RemoteCrossDevicePresentationThunkInput = {
  qrcode: string;
  allowed: PresentationStateKeys;
};

export type RemoteCrossDevicePresentationThunkOutput = {
  authResponse: AuthResponse;
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
  // Checks if the wallet instance attestation needs to be requested
  if (shouldRequestAttestationSelector(getState())) {
    await dispatch(getAttestationThunk());
  }

  // Gets the Wallet Instance Attestation from the persisted store
  const walletInstanceAttestation = selectAttestation(getState());
  if (!walletInstanceAttestation) {
    throw new Error("Wallet Instance Attestation not found");
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

  const { rpConf, subject } =
    await Credential.Presentation.evaluateRelyingPartyTrust(qrParams.client_id);

  const { requestObjectEncodedJwt } =
    await Credential.Presentation.getRequestObject(qrParams.request_uri);

  const { requestObject } = await Credential.Presentation.verifyRequestObject(
    requestObjectEncodedJwt,
    {
      rpConf,
      clientId: qrParams.client_id,
      rpSubject: subject,
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
    return processRefusedPresentation(requestObject);
  }

  if (requestObject.dcql_query) {
    return processPresentation(requestObject, rpConf, credentialsSdJwt);
  }

  if (requestObject.presentation_definition) {
    return processLegacyPresentation(requestObject, rpConf, credentialsSdJwt);
  }

  throw new Error("Invalid request object");
});

// Presentation definition flow
const processLegacyPresentation: ProcessPresentation = async (
  requestObject,
  rpConf,
  credentialsSdJwt
) => {
  const { presentationDefinition } =
    await Credential.Presentation.fetchPresentDefinition(requestObject);

  const evaluateInputDescriptors =
    await Credential.Presentation.evaluateInputDescriptors(
      presentationDefinition.input_descriptors,
      credentialsSdJwt
    );

  const credentialAndInputDescriptor = evaluateInputDescriptors.map(
    (evaluateInputDescriptor) => {
      // Present only the mandatory claims
      const requestedClaims =
        evaluateInputDescriptor.evaluatedDisclosure.requiredDisclosures.map(
          (item) => item.decoded[1]
        );

      return {
        requestedClaims,
        inputDescriptor: evaluateInputDescriptor.inputDescriptor,
        credential: evaluateInputDescriptor.credential,
        keyTag: evaluateInputDescriptor.keyTag,
      };
    }
  );

  const remotePresentations =
    await Credential.Presentation.prepareLegacyRemotePresentations(
      credentialAndInputDescriptor,
      requestObject.nonce,
      requestObject.client_id
    );

  const authResponse =
    await Credential.Presentation.sendLegacyAuthorizationResponse(
      requestObject,
      presentationDefinition.id,
      remotePresentations,
      rpConf
    );

  return {
    authResponse,
    requestObject,
    requestedClaims: credentialAndInputDescriptor.flatMap(
      (c) => c.requestedClaims
    ),
  };
};

// DCQL flow
const processPresentation: ProcessPresentation = async (
  requestObject,
  rpConf,
  credentialsSdJwt
) => {
  const result = Credential.Presentation.evaluateDcqlQuery(
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
    await Credential.Presentation.prepareRemotePresentations(
      credentialsToPresent,
      requestObject.nonce,
      requestObject.client_id
    );

  const authResponse = await Credential.Presentation.sendAuthorizationResponse(
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
const processRefusedPresentation = async (requestObject: RequestObject) => {
  const authResponse =
    await Credential.Presentation.sendAuthorizationErrorResponse(
      requestObject,
      {
        error: "invalid_request_object",
        errorDescription: "Mock error during request object validation",
      }
    );
  return { authResponse, requestObject, requestedClaims: [] };
};
