import { createAppAsyncThunk } from "./utils";
import { Credential } from "@pagopa/io-react-native-wallet";
import {
  selectAttestation,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { getAttestationThunk } from "./attestation";
import type { PresentationStateKeys } from "../store/reducers/presentation";
import { selectPid } from "../store/reducers/pid";

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
  // Checks if the wallet instance attestation needs to be reuqested
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

  /* ---------- Presentation definition flow ---------- */
  const { presentationDefinition } =
    await Credential.Presentation.fetchPresentDefinition(requestObject);

  const pid = selectPid(getState());
  if (!pid) {
    throw new Error("PID not found");
  }
  const credentialsSdJwt: [string, string][] = [[pid.keyTag, pid.credential]];

  const evaluateInputDescriptors =
    await Credential.Presentation.evaluateInputDescriptors(
      presentationDefinition.input_descriptors,
      credentialsSdJwt
    );

  const credentialAndInputDescriptor = evaluateInputDescriptors.map(
    (evaluateInputDescriptor) => {
      // Present only the mandatory claims
      const requestedClaims = [
        ...evaluateInputDescriptor.evaluatedDisclosure.requiredDisclosures.map(
          (item) => item.decoded[1]
        ),
      ];
      return {
        requestedClaims,
        inputDescriptor: evaluateInputDescriptor.inputDescriptor,
        credential: evaluateInputDescriptor.credential,
        keyTag: evaluateInputDescriptor.keyTag,
      };
    }
  );

  const remotePresentations =
    await Credential.Presentation.prepareRemotePresentations(
      credentialAndInputDescriptor,
      requestObject.nonce,
      requestObject.client_id
    );

  console.log(remotePresentations);

  /* ---------- DCQL flow ---------- */

  return {};
});
