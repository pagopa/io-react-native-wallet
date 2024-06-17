import uuid from "react-native-uuid";
import { AuthorizationDetail, makeParRequest } from "../../utils/par";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { type Out } from "../../utils/misc";
import type { StartFlow } from "./01-start-flow";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { ASSERTION_TYPE } from "./const";
import type { IdentificationContext } from "@pagopa/io-react-native-wallet";
import parseUrl from "parse-url";
import { LoginResponseError } from "../../utils/errors";
import {
  type IdentificationResult,
  IdentificationResultShape,
} from "../../utils/identification";

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

export type StartUserAuthorization = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"],
  context: {
    wiaCryptoContext: CryptoContext;
    identificationContext: IdentificationContext;
    walletInstanceAttestation: string;
    redirectUri: string;
    overrideRedirectUri?: string;
    idphint: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<IdentificationResult & { clientId: string }>;

/**
 * Start the User authorization phase.
 * Perform the Pushed Authorization Request as defined in OAuth 2.0 protocol.
 *
 * @param issuerConf The Issuer configuration
 * @param credentialType The type of the credential to be requested
 * @param context.wiaCryptoContext The context to access the key associated with the Wallet Instance Attestation
 * @param context.walletInstanceAttestation The Wallet Instance Attestation token
 * @param context.additionalParams Hash set of parameters to be passed to the authorization endpoint
 * (used as a temporary fix until we have a proper User identity in the PID token provider)
 * TODO: [SIW-630]
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
    identificationContext,
    walletInstanceAttestation,
    redirectUri,
    overrideRedirectUri,
    idphint,
    appFetch = fetch,
  } = ctx;
  const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
  const codeVerifier = `${uuid.v4()}`;
  // Make a PAR request to the credential issuer and return the response url
  const parUrl =
    issuerConf.openid_credential_issuer.pushed_authorization_request_endpoint;
  // the responseMode this is specified in the entity configuration https://github.com/italia/eudi-wallet-it-docs/pull/314/files#diff-94e69d33268a4f2df6ac286d8ab2f24606e869d55c6d8ed1bc35884c14e12abaL178
  const responseMode = "query";
  const getPar = makeParRequest({ wiaCryptoContext, appFetch });
  const issuerRequestUri = await getPar(
    clientId,
    codeVerifier,
    redirectUri,
    responseMode,
    parUrl,
    walletInstanceAttestation,
    [selectCredentialDefinition(issuerConf, credentialType)],
    ASSERTION_TYPE
  );

  // do the get request in the webview

  // Initialize authorization by requesting the authz request uri
  const authzRequestEndpoint =
    issuerConf.openid_credential_issuer.authorization_endpoint;
  const params = new URLSearchParams({
    client_id: clientId,
    request_uri: issuerRequestUri,
    idphint,
  });

  const data = await identificationContext.identify(
    overrideRedirectUri ?? `${authzRequestEndpoint}?${params}`,
    "iowallet"
  );

  const urlParse = parseUrl(data);
  const result = IdentificationResultShape.safeParse(urlParse.query);
  if (result.success) {
    return { ...result.data, clientId };
  } else {
    throw new LoginResponseError(result.error.message);
  }
};
