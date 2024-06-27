import uuid from "react-native-uuid";
import { AuthorizationDetail, makeParRequest } from "../../utils/par";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import {
  generateRandomAlphaNumericString,
  hasStatus,
  type Out,
} from "../../utils/misc";
import type { StartFlow } from "./01-start-flow";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { ASSERTION_TYPE } from "./const";
import {
  WalletInstanceAttestation,
  type IdentificationContext,
} from "@pagopa/io-react-native-wallet";
import parseUrl from "parse-url";
import { IdentificationError } from "../../utils/errors";
import { IdentificationResultShape } from "../../utils/identification";
import { withEphemeralKey } from "../../utils/crypto";
import { createDPopToken } from "../../utils/dpop";
import { createPopToken } from "../../utils/pop";

const selectCredentialDefinition = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"]
): AuthorizationDetail => {
  const credential_configurations_supported =
    issuerConf.openid_credential_issuer.credential_configurations_supported;

  const [result] = Object.keys(credential_configurations_supported)
    .filter((e) => e.includes(credentialType))
    .map((e) => ({
      credential_configuration_id: credentialType,
      format: credential_configurations_supported[e]!.format,
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
    overrideRedirectUri?: string; // temporary parameter to override the redirect uri until we have an actual implementation
    idphint: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<any>;

/**
 * Start the User authorization phase.
 * Perform the Pushed Authorization Request as defined in OAuth 2.0 protocol.
 *
 * @param issuerConf The Issuer configuration
 * @param credentialType The type of the credential to be requested
 * @param context.wiaCryptoContext The context to access the key associated with the Wallet Instance Attestation
 * @param context.identificationContext The context to identify the user which will be used to start the authorization
 * @param context.walletInstanceAttestation The Wallet Instance Attestation token
 * @param context.additionalParams Hash set of parameters to be passed to the authorization endpoint
 * (used as a temporary fix until we have a proper User identity in the PID token provider)
 * TODO: [SIW-630]
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @throws {IdentificationError} When the response from the identification response is not parsable
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
    idphint,
    appFetch = fetch,
  } = ctx;

  const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
  const codeVerifier = generateRandomAlphaNumericString(64); // WARNING: This is not a secure way to generate a code verifier CHANGE ME
  console.log(codeVerifier.length);
  // Make a PAR request to the credential issuer and return the response url
  const parEndpoint =
    issuerConf.oauth_authorization_server.pushed_authorization_request_endpoint;

  const parUrl = new URL(parEndpoint);
  const aud = `${parUrl.protocol}//${parUrl.hostname}`;

  const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
    .payload.cnf.jwk.kid;

  /*
  the responseMode this is specified in the entity configuration and should be query for PID and form_post.jwt for other credentials
  https://github.com/italia/eudi-wallet-it-docs/pull/314/files#diff-94e69d33268a4f2df6ac286d8ab2f24606e869d55c6d8ed1bc35884c14e12abaL178
  */
  const responseMode = "query";
  const getPar = makeParRequest({ wiaCryptoContext, appFetch });
  const issuerRequestUri = await getPar(
    clientId,
    codeVerifier,
    redirectUri,
    responseMode,
    parEndpoint,
    walletInstanceAttestation,
    [selectCredentialDefinition(issuerConf, credentialType)],
    ASSERTION_TYPE
  );
  // Initialize authorization by requesting the authz request uri
  const authzRequestEndpoint =
    issuerConf.oauth_authorization_server.authorization_endpoint;
  const params = new URLSearchParams({
    client_id: clientId,
    request_uri: issuerRequestUri,
    idphint,
  });

  const redirectSchema = new URL(redirectUri).protocol.replace(":", "");

  const data = await identificationContext
    .identify(`${authzRequestEndpoint}?${params}`, redirectSchema)
    .catch((e) => {
      throw new IdentificationError(e.message);
    });

  console.log("identification result", data);

  const urlParse = parseUrl(data);

  console.log("urlparse result", urlParse);
  const result = IdentificationResultShape.safeParse(urlParse.query);
  console.log(result);

  if (!result.success) {
    throw new IdentificationError(result.error.message);
  }

  const { code } = result.data;

  // old auth access
  const tokenUrl = issuerConf.oauth_authorization_server.token_endpoint;

  // Use an ephemeral key to be destroyed after use
  const signedDPop = await withEphemeralKey((ephemeralContext) =>
    createDPopToken(
      {
        htm: "POST",
        htu: tokenUrl,
        jti: `${uuid.v4()}`,
      },
      ephemeralContext
    )
  );

  const signedWiaPoP = await createPopToken(
    {
      jti: `${uuid.v4()}`,
      aud,
      iss,
    },
    wiaCryptoContext
  );
  const requestBody = {
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_assertion_type: ASSERTION_TYPE,
    client_assertion: walletInstanceAttestation + "~" + signedWiaPoP,
  };

  var formBody = new URLSearchParams(requestBody);

  return appFetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: signedDPop,
    },
    body: formBody.toString(),
  })
    .then(hasStatus(200))
    .then((res) => res.json())
    .then((body) => ({
      accessToken: body.access_token,
      nonce: body.c_nonce,
      clientId,
    }));
};
