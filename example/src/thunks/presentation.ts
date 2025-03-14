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

type DcqlQuery = Parameters<Credential.Presentation.EvaluateDcqlQuery>[1];
type RequestObject = Awaited<
  ReturnType<Credential.Presentation.VerifyRequestObject>
>["requestObject"];
type RpConf = Awaited<
  ReturnType<Credential.Presentation.EvaluateRelyingPartyTrust>
>["rpConf"];

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
  result: Awaited<
    ReturnType<Credential.Presentation.SendAuthorizationResponse>
  >;
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
  const qrcode = args.qrcode;
  const url = new URL(qrcode);

  const requestUri = url.searchParams.get("request_uri");
  const clientId = url.searchParams.get("client_id");
  const state = url.searchParams.get("state");
  const requestUriMethod = (url.searchParams.get("request_uri_method") ??
    "get") as "get" | "post";

  if (!requestUri || !clientId) {
    throw new Error("Invalid presentation link");
  }

  const qrParams = Credential.Presentation.startFlowFromQR({
    requestUri,
    clientId,
    requestUriMethod,
    ...(state && { state }),
  });

  const { rpConf } = await Credential.Presentation.evaluateRelyingPartyTrust(
    qrParams.clientId
  );

  const { requestObjectEncodedJwt } =
    await Credential.Presentation.getRequestObject(qrParams.requestUri);

  const { requestObject } = await Credential.Presentation.verifyRequestObject(
    requestObjectEncodedJwt,
    { clientId: qrParams.clientId, rpConf }
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

  return { result: authResponse };
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
      requestedClaims: requiredDisclosures.map((item) => item.decoded[1]),
    })
  );

  const remotePresentations =
    await Credential.Presentation.prepareRemotePresentations(
      credentialsToPresent,
      requestObject.nonce,
      requestObject.client_id
    );

  return {
    result: {},
  };
};
