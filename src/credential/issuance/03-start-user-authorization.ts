import * as z from "zod";
import uuid from "react-native-uuid";
import { AuthorizationDetail, makeParRequest } from "../../utils/par";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { getJwtFromFormPost } from "../../utils/decoder";
import { hasStatus, type Out } from "../../utils/misc";
import type { StartFlow } from "./01-start-flow";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { ASSERTION_TYPE } from "./const";

const selectCredentialDefinition = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"]
): AuthorizationDetail => {
  const { credentials_supported } = issuerConf.openid_credential_issuer;

  const [result] = credentials_supported
    .filter((e) => e.credential_definition.type.includes(credentialType))
    .map((e) => ({
      credential_definition: { type: credentialType },
      format: e.format,
      type: "openid_credential" as const,
    }));

  if (!result) {
    throw new Error(`No credential support the type '${credentialType}'`);
  }
  return result;
};

const decodeAuthorizationResponse = async (
  raw: string
): Promise<{ request_uri: string }> => {
  const {
    decodedJwt: { payload },
  } = await getJwtFromFormPost(raw);

  /**
   * FIXME: [SIW-628] This step must not make any difference on the credential
   * we are authorizing for, being a PID or any other (Q)EAA.
   *
   * Currently, PID issuer is implemented to skip the CompleteUserAuthorization step
   * thus returning a stubbed (code, state) pair.
   *
   * This is a workaround to proceeed the flow anyway.
   * If the response does not map what expected (CorrectShape),
   * we try parse into (code, state) to check if we are in the PID scenario.
   * In that case, a stub value is returned (will not be evaluated anyway).
   *
   * This workaround will be obsolete once the PID issuer fixes its implementation
   */
  const CorrectShape = z.object({ request_uri: z.string() });
  const WrongShapeForPID = z.object({ code: z.string(), state: z.string() });

  const [correct, wrong] = [
    CorrectShape.safeParse(payload),
    WrongShapeForPID.safeParse(payload),
  ];

  if (correct.success) {
    return correct.data;
  } else if (wrong.success) {
    return { request_uri: "https://fake-request-uri" };
  }
  throw correct.error;
};

export type StartUserAuthorization = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"],
  context: {
    wiaCryptoContext: CryptoContext;
    walletInstanceAttestation: string;
    walletProviderBaseUrl: string;
    additionalParams?: Record<string, string>;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{ requestUri: string; clientId: string }>;

/**
 * Start the User authorization phase.
 * Perform the Pushed Authorization Request as defined in OAuth 2.0 protocol.
 *
 * @param issuerConf The Issuer configuration
 * @param credentialType The type of the credential to be requested
 * @param context.wiaCryptoContext The context to access the key associated with the Wallet Instance Attestation
 * @param context.walletInstanceAttestation The Wallet Instance Attestation token
 * @param context.walletProviderBaseUrl The base url of the Wallet Provider
 * @param context.additionalParams Hash set of parameters to be passed to the authorization endpoint (used as a temporary fix until we have a proper User identity in the PID token provider)
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The request uri to continue the authorization to
 */
export const startUserAuthorization: StartUserAuthorization = async (
  issuerConf,
  credentialType,
  ctx
) => {
  const {
    wiaCryptoContext,
    walletInstanceAttestation,
    walletProviderBaseUrl,
    additionalParams = {},
    appFetch = fetch,
  } = ctx;
  const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
  const codeVerifier = `${uuid.v4()}`;
  // Make a PAR request to the credential issuer and return the response url
  const parUrl =
    issuerConf.openid_credential_issuer.pushed_authorization_request_endpoint;
  const getPar = makeParRequest({ wiaCryptoContext, appFetch });
  const issuerRequestUri = await getPar(
    clientId,
    codeVerifier,
    walletProviderBaseUrl,
    parUrl,
    walletInstanceAttestation,
    [selectCredentialDefinition(issuerConf, credentialType)],
    ASSERTION_TYPE
  );

  // Initialize authorization by requesting the authz request uri
  const authzRequestEndpoint =
    issuerConf.openid_credential_issuer.authorization_endpoint;
  const params = new URLSearchParams({
    client_id: clientId,
    request_uri: issuerRequestUri,
    ...additionalParams,
  });

  const { request_uri } = await appFetch(`${authzRequestEndpoint}?${params}`)
    .then(hasStatus(200))
    .then((res) => res.text())
    .then(decodeAuthorizationResponse);

  return { requestUri: request_uri, clientId };
};
