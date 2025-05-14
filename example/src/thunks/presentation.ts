import { createAppAsyncThunk } from "./utils";
import { Credential } from "@pagopa/io-react-native-wallet";
import {
  selectAttestation,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { selectPid } from "../store/reducers/pid";
import { selectCredentials } from "../store/reducers/credential";
import { getAttestationThunk } from "./attestation";
import type { PresentationStateKeys } from "../store/reducers/presentation";

export type RemoteCrossDevicePresentationThunkInput = {
  qrcode: string;
  allowed: PresentationStateKeys;
};

export type RemoteCrossDevicePresentationThunkOutput = {
  result: Awaited<
    ReturnType<Credential.Presentation.SendAuthorizationResponse>
  >;
};
export type RequestObject = Awaited<
  ReturnType<Credential.Presentation.VerifyRequestObjectSignature>
>["requestObject"];
type DcqlQuery = Parameters<Credential.Presentation.EvaluateDcqlQuery>[0];
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
  const request_uri = url.searchParams.get("request_uri");
  const client_id = url.searchParams.get("client_id");
  if (!request_uri || !client_id) {
    throw new Error("Invalid presentation link");
  }

  const { requestUri } = Credential.Presentation.startFlowFromQR(
    request_uri,
    client_id
  );

  const { requestObjectEncodedJwt } =
    await Credential.Presentation.getRequestObject(requestUri);

  const jwks = await Credential.Presentation.fetchJwksFromRequestObject(
    requestObjectEncodedJwt
  );

  const { requestObject } =
    await Credential.Presentation.verifyRequestObjectSignature(
      requestObjectEncodedJwt,
      jwks.keys
    );

  const credentialsSdJwt: [string, string, string][] = [];
  const credentialsMdoc: [string, string, string][] = [];

  const pid = selectPid(getState());
  if (!pid) {
    throw new Error("PID not found");
  }
  credentialsSdJwt.push([pid.credentialType, pid.keyTag, pid.credential]);

  const credentials = selectCredentials(getState());
  const mDL = credentials["org.iso.18013.5.1.mDL"];
  if (mDL?.credential) {
    credentialsMdoc.push([mDL.credentialType, mDL.keyTag, mDL.credential]);
  }
  const healthId = credentials["eu.europa.ec.eudi.hiid.1"];
  if (healthId?.credential) {
    credentialsMdoc.push([
      healthId.credentialType,
      healthId.keyTag,
      healthId.credential,
    ]);
  }

  if (requestObject.dcql_query) {
    const authResponse = await handleDcqlResponse(
      args,
      requestObject,
      credentialsSdJwt,
      credentialsMdoc,
      jwks.keys
    );

    return { result: authResponse };
  }

  if (requestObject.presentation_definition) {
    const authResponse = await handlePresentationDefinitionResponse(
      args,
      requestObject,
      credentialsSdJwt,
      credentialsMdoc,
      jwks.keys
    );

    return { result: authResponse };
  }

  throw new Error("Invalid request object");
});

/**
 * Helper method to prepare and send presentation authorization response
 */
const handleDcqlResponse = async (
  args: RemoteCrossDevicePresentationThunkInput,
  requestObject: RequestObject,
  credentialsSdJwt: [string, string, string][],
  credentialsMdoc: [string, string, string][],
  jwksKeys: any[]
) => {
  const evaluateDcqlQuery = await Credential.Presentation.evaluateDcqlQuery(
    requestObject.dcql_query as DcqlQuery,
    credentialsSdJwt,
    credentialsMdoc
  );

  const credentialsToPresent = evaluateDcqlQuery.map(
    ({ requiredDisclosures, ...rest }) => ({
      ...rest,
      credentialInputId: rest.id,
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

  return args.allowed === "acceptanceState"
    ? await Credential.Presentation.sendAuthorizationResponseDcql(
        requestObject,
        jwksKeys,
        remotePresentations
      )
    : await Credential.Presentation.sendAuthorizationErrorResponse(
        requestObject,
        "access_denied",
        jwksKeys
      );
};

/**
 * Helper method to prepare and send presentation authorization response
 */
const handlePresentationDefinitionResponse = async (
  args: RemoteCrossDevicePresentationThunkInput,
  requestObject: RequestObject,
  credentialsSdJwt: [string, string, string][],
  credentialsMdoc: [string, string, string][],
  jwksKeys: any[]
) => {
  const { presentationDefinition } =
    await Credential.Presentation.fetchPresentDefinition(requestObject);

  const evaluateInputDescriptors =
    await Credential.Presentation.evaluateInputDescriptors(
      presentationDefinition.input_descriptors,
      credentialsSdJwt,
      credentialsMdoc
    );

  const credentialAndInputDescriptor = evaluateInputDescriptors.map(
    (evaluateInputDescriptor) => {
      // Present only the mandatory claims
      const format = Object.keys(
        evaluateInputDescriptor.inputDescriptor.format || {}
      )[0]! as "mso_mdoc" | "vc+sd-jwt";
      return format === "mso_mdoc"
        ? {
            requestedClaims:
              evaluateInputDescriptor.evaluatedDisclosure.requiredDisclosures,
            credentialInputId: evaluateInputDescriptor.inputDescriptor.id,
            credential: evaluateInputDescriptor.credential,
            keyTag: evaluateInputDescriptor.keyTag,
            format,
            doctype: evaluateInputDescriptor.inputDescriptor.id,
          }
        : {
            requestedClaims:
              evaluateInputDescriptor.evaluatedDisclosure.requiredDisclosures,
            credentialInputId: evaluateInputDescriptor.inputDescriptor.id,
            credential: evaluateInputDescriptor.credential,
            keyTag: evaluateInputDescriptor.keyTag,
            format,
            vct: evaluateInputDescriptor.inputDescriptor.id,
          };
    }
  );

  const authRequestObject = {
    nonce: requestObject.nonce,
    clientId: requestObject.client_id,
    responseUri: requestObject.response_uri,
  };

  const remotePresentations =
    await Credential.Presentation.prepareRemotePresentations(
      credentialAndInputDescriptor,
      authRequestObject
    );

  return args.allowed === "acceptanceState"
    ? await Credential.Presentation.sendAuthorizationResponse(
        requestObject,
        presentationDefinition.id,
        jwksKeys,
        remotePresentations
      )
    : await Credential.Presentation.sendAuthorizationErrorResponse(
        requestObject,
        "access_denied",
        jwksKeys
      );
};
