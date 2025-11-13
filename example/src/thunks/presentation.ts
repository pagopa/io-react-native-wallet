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
import { selectPid } from "../store/reducers/pid";
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

/**
 * Type of the function to process the presentation request,
 * either when it uses DCQL queries or the legacy `presentation_definition`.
 */
type ProcessPresentation = (
  requestObject: RequestObject,
  rpConf: RpConf,
  credentialsSdJwt: [CryptoContext, string][]
) => Promise<RemoteCrossDevicePresentationThunkOutput>;

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
    const [, hash] = qrParams.client_id.split("x509_hash:");
    console.log("x509_hash:", hash);
  }

  /* if (qrParams.client_id.startsWith("openid_federation:")) {
    const { rpConf, subject } =
      await Credential.Presentation.evaluateRelyingPartyTrust(
        qrParams.client_id
      );
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

  const pid = selectPid(getState());
  const credentials = selectCredentials(getState());

  const credentialsSdJwt = [
    ...Object.values({ pid, ...credentials })
      .filter(isDefined)
      .map((c) => [c.credentialType, c.keyTag, c.credential]),
  ] as [string, string, string][];

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
        cryptoContext: evaluateInputDescriptor.cryptoContext,
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
