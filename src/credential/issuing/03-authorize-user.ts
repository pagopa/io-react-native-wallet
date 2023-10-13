import * as z from "zod";
import uuid from "react-native-uuid";
import { AuthorizationDetail, makeParRequest } from "../../utils/par";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { getJwtFromFormPost } from "../../utils/decoder";
import { hasStatus, type Out } from "./utils";
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

type UserAuthorizationMethod = (
  uri: string
) => Promise<{ code: string; state: string }>;

type AuthorizeUserContext = {
  wiaCryptoContext: CryptoContext;
  walletInstanceAttestation: string;
  walletProviderBaseUrl: string;
  userAuthorizationMethod: UserAuthorizationMethod;
  appFetch?: GlobalFetch["fetch"];
};

export type AuthorizeUser = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"]
) => Promise<{ code: string; state: string; clientId: string }>;

export const authorizeUser =
  (ctx: AuthorizeUserContext): AuthorizeUser =>
  async (issuerConf, credentialType) => {
    const {
      wiaCryptoContext,
      walletInstanceAttestation,
      walletProviderBaseUrl,
      userAuthorizationMethod,
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
    });

    const { request_uri } = await appFetch(`${authzRequestEndpoint}?${params}`)
      .then(hasStatus(200))
      .then((res) => res.text())
      .then(getJwtFromFormPost)
      .then(({ decodedJwt }) => {
        console.log("-->decodedJwt", decodedJwt.payload);
        return z.object({ request_uri: z.string() }).parse(decodedJwt.payload);
      });

    // Authorize the user with the given method
    const { code, state } = await userAuthorizationMethod(request_uri);
    return { code, state, clientId };
  };
