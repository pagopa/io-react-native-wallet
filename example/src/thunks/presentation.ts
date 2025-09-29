import { createAppAsyncThunk } from "./utils";
import { Credential } from "@pagopa/io-react-native-wallet";
import { shouldRequestAttestationSelector } from "../store/reducers/attestation";
import { selectCredentials } from "../store/reducers/credential";
import { getAttestationThunk } from "./attestation";
import type { PresentationStateKeys } from "../store/reducers/presentation";
import type { RequestObject } from "src/credential/presentation/types";

export type RemoteCrossDevicePresentationThunkInput = {
  qrcode: string;
  allowed: PresentationStateKeys;
};

export type RemoteCrossDevicePresentationThunkOutput = {
  result: Awaited<
    ReturnType<Credential.Presentation.SendAuthorizationResponse>
  >;
};
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

  const qrcode = args.qrcode;
  const url = new URL(qrcode);

  const requestObject = Credential.Presentation.startFlowFromQR(url);
  const credentialsSdJwt: [string, string, string][] = [];

  const credentialsMdoc: [string, string, string][] = [];

  const credentials = selectCredentials(getState());
  const mDL = Array.isArray(credentials["org.iso.18013.5.1.mDL"])
    ? credentials["org.iso.18013.5.1.mDL"][0]
    : credentials["org.iso.18013.5.1.mDL"];
  if (mDL?.credential) {
    credentialsMdoc.push([mDL.doctype, mDL.keyTag, mDL.credential]);
  }
  const healthId = Array.isArray(credentials["eu.europa.ec.eudi.hiid.1"])
    ? credentials["eu.europa.ec.eudi.hiid.1"][0]
    : credentials["eu.europa.ec.eudi.hiid.1"];
  if (healthId?.credential) {
    credentialsMdoc.push([
      healthId.doctype,
      healthId.keyTag,
      healthId.credential,
    ]);
  }
  const badge = Array.isArray(credentials.mso_mdoc_CompanyBadge)
    ? credentials.mso_mdoc_CompanyBadge[0]
    : credentials.mso_mdoc_CompanyBadge;
  if (badge?.credential) {
    credentialsMdoc.push([badge.doctype, badge.keyTag, badge.credential]);
  }

  const av = Array.isArray(
    credentials["eu.europa.ec.eudi.age_verification_mdoc"]
  )
    ? credentials["eu.europa.ec.eudi.age_verification_mdoc"][0]
    : credentials["eu.europa.ec.eudi.age_verification_mdoc"];
  if (av?.credential) {
    credentialsMdoc.push([av.doctype, av.keyTag, av.credential]);
  }

  if (requestObject.dcql_query) {
    const authResponse = await handleDcqlResponse(
      args,
      requestObject,
      credentialsSdJwt,
      credentialsMdoc
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
  credentialsMdoc: [string, string, string][]
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
    ? await Credential.Presentation.sendAuthorizationResponse(
        requestObject,
        remotePresentations
      )
    : await Credential.Presentation.sendAuthorizationErrorResponse(
        requestObject,
        "access_denied"
      );
};
