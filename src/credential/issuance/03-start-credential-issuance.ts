import uuid from "react-native-uuid";
import { AuthorizationDetail, makeParRequest } from "../../utils/par";
import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
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
import { IdentificationError, ValidationFailed } from "../../utils/errors";
import { IdentificationResultShape } from "../../utils/identification";
import { createCryptoContextFor } from "../../utils/crypto";
import { createDPopToken } from "../../utils/dpop";
import { createPopToken } from "../../utils/pop";
import { CredentialResponse, TokenResponse } from "./types";
import { generate } from "@pagopa/io-react-native-crypto";

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

export type StartCredentialIssuance = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"],
  context: {
    wiaCryptoContext: CryptoContext;
    credentialCryptoContext: CryptoContext;
    identificationContext: IdentificationContext;
    walletInstanceAttestation: string;
    redirectUri: string;
    overrideRedirectUri?: string; // temporary parameter to override the redirect uri until we have an actual implementation
    idphint: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<CredentialResponse>;

/**
 * Start the User authorization phase.
 * Perform the Pushed Authorization Request as defined in OAuth 2.0 protocol.
 *
 * @param issuerConf The Issuer configuration
 * @param credentialType The type of the credential to be requested
 * @param context.wiaCryptoContext The context to access the key associated with the Wallet Instance Attestation
 * @param context.credentialCryptoContext The context to access the key to associat with credential
 * @param context.identificationContext The context to identify the user which will be used to start the authorization
 * @param context.walletInstanceAttestation The Wallet Instance Attestation token
 * @param context.redirectUri The internal URL to which to redirect has passed the in-app browser login phase
 * @param context.idphint Unique identifier of the SPID IDP
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @throws {IdentificationError} When the response from the identification response is not parsable
 * @returns The credential obtained
 */

export const startCredentialIssuance: StartCredentialIssuance = async (
  issuerConf,
  credentialType,
  ctx
) => {
  const {
    wiaCryptoContext,
    credentialCryptoContext,
    identificationContext,
    walletInstanceAttestation,
    redirectUri,
    idphint,
    appFetch = fetch,
  } = ctx;

  const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
  const codeVerifier = generateRandomAlphaNumericString(64); // WARNING: This is not a secure way to generate a code verifier CHANGE ME

  // Make a PAR request to the credential issuer and return the response url
  const parEndpoint =
    issuerConf.oauth_authorization_server.pushed_authorization_request_endpoint;

  const parUrl = new URL(parEndpoint);
  const aud = `${parUrl.protocol}//${parUrl.hostname}`;

  const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
    .payload.cnf.jwk.kid;

  const credentialDefinition = selectCredentialDefinition(
    issuerConf,
    credentialType
  );
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
    [credentialDefinition],
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

  const urlParse = parseUrl(data);
  const result = IdentificationResultShape.safeParse(urlParse.query);
  if (!result.success) {
    throw new IdentificationError(result.error.message);
  }

  const { code } = result.data;

  // old auth access
  const tokenUrl = issuerConf.oauth_authorization_server.token_endpoint;

  const dpopKeyTag = uuid.v4().toString();
  await generate(dpopKeyTag);
  const ephimeralAuthContext = createCryptoContextFor(dpopKeyTag); // delete me after use

  // Use an ephemeral key to be destroyed after use
  const tokenRequestSignedDPop = await createDPopToken(
    {
      htm: "POST",
      htu: tokenUrl,
      jti: `${uuid.v4()}`,
    },
    ephimeralAuthContext
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

  var authorizationRequestFormBody = new URLSearchParams(requestBody);

  const tokenRes = await appFetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: tokenRequestSignedDPop,
    },
    body: authorizationRequestFormBody.toString(),
  })
    .then(hasStatus(200))
    .then((res) => res.json())
    .then((body) => TokenResponse.safeParse(body));

  if (!tokenRes.success) {
    throw new ValidationFailed(tokenRes.error.message);
  }

  const accessTokenResponse = tokenRes.data;

  const credentialUrl = issuerConf.openid_credential_issuer.credential_endpoint;

  /** JWT proof token to bind the request nonce
      to the key that will bind the holder User with the Credential
      @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-proof-types */
  const signedNonceProof = await createNonceProof(
    accessTokenResponse.c_nonce,
    clientId,
    credentialUrl,
    credentialCryptoContext
  );

  // Validation of accessTokenResponse.authorization_details if contain credentialDefinition
  const constainsCredentialDefinition =
    accessTokenResponse.authorization_details.some(
      (c) =>
        c.credential_configuration_id ===
          credentialDefinition.credential_configuration_id &&
        c.format === credentialDefinition.format &&
        c.type === credentialDefinition.type
    );

  if (!constainsCredentialDefinition) {
    throw new ValidationFailed(
      "The access token response does not contain the requested credential"
    );
  }

  /** The credential request body */
  const credentialRequestFormBody = {
    credential_definition: {
      type: [credentialDefinition.credential_configuration_id],
    },
    format: credentialDefinition.format,
    proof: {
      jwt: signedNonceProof,
      proof_type: "jwt",
    },
  };

  const credentialRes = await appFetch(credentialUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      DPoP: tokenRequestSignedDPop,
      Authorization: `${accessTokenResponse.token_type} ${accessTokenResponse.access_token}`,
    },
    body: JSON.stringify(credentialRequestFormBody),
  })
    .then(hasStatus(200))
    .then((res) => res.json())
    .then((body) => CredentialResponse.safeParse(body));

  if (!credentialRes.success) {
    throw new ValidationFailed(credentialRes.error.message);
  }

  return credentialRes.data;
};

export const createNonceProof = async (
  nonce: string,
  issuer: string,
  audience: string,
  ctx: CryptoContext
): Promise<string> => {
  const jwk = await ctx.getPublicKey();
  return new SignJWT(ctx)
    .setPayload({
      nonce,
    })
    .setProtectedHeader({
      typ: "openid4vci-proof+jwt",
      jwk,
    })
    .setAudience(audience)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();
};
