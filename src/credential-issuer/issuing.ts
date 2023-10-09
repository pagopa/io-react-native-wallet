import { type CryptoContext } from "@pagopa/io-react-native-jwt";
import { generate, deleteKey } from "@pagopa/io-react-native-crypto";
import uuid from "react-native-uuid";
import { PidIssuingError, TokenError } from "../utils/errors";

import * as z from "zod";

import {
  makeParRequest,
  type AuthorizationDetails,
  createNonceProof,
} from "../utils/par";
import { getJwtFromFormPost } from "../utils/decoder";
import type { EntityConfiguration } from "../trust/types";
import { createCryptoContextFor } from "..";
import { createDPopToken } from "../utils/dpop";
import type { AuthorizationConf } from "../pid/issuing";

type RpAuthenticationRequestResponse = z.infer<
  typeof RpAuthenticationRequestResponse
>;
const RpAuthenticationRequestResponse = z.object({
  client_id: z.string(),
  request_uri: z.string(),
});

const assertionType =
  "urn:ietf:params:oauth:client-assertion-type:jwt-client-attestation";

/**
 * Make an authorization request
 */
const getRpAuthenticationRequest =
  ({ appFetch = fetch }: { appFetch?: GlobalFetch["fetch"] }) =>
  async (
    clientId: string,
    requestUri: string,
    credentialIssuerEntityConfiguration: EntityConfiguration
  ): Promise<RpAuthenticationRequestResponse> => {
    //TODO: Obtain from entity configuration
    const credentialProviderBaseUrl =
      credentialIssuerEntityConfiguration.payload.iss;
    const authzRequestEndpoint = new URL(
      "/authorize",
      credentialProviderBaseUrl
    ).href;

    const params = new URLSearchParams({
      client_id: clientId,
      request_uri: requestUri,
    });

    const response = await appFetch(authzRequestEndpoint + "?" + params, {
      method: "GET",
    });

    if (response.status === 200) {
      const formData = await response.text();
      const { decodedJwt } = await getJwtFromFormPost(formData);
      return RpAuthenticationRequestResponse.parse(decodedJwt.payload);
    }

    throw new PidIssuingError(
      `Unable to obtain Authorization Request. Response code: ${await response.text()}`
    );
  };

export const authorizeRpIssuing =
  ({
    wiaCryptoContext,
    appFetch = fetch,
  }: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }) =>
  async (
    walletInstanceAttestation: string,
    walletProviderBaseUrl: string,
    credentialIssuerEntityConfiguration: EntityConfiguration,
    authorizationDetails: AuthorizationDetails
  ): Promise<RpAuthenticationRequestResponse> => {
    const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
    const codeVerifier = `${uuid.v4()}`;

    //TODO: Obtain from entity configuration
    const credentialProviderBaseUrl =
      credentialIssuerEntityConfiguration.payload.iss;
    const parUrl = new URL("/as/par", credentialProviderBaseUrl).href;

    // Make a PAR request to the credential issuer and return the response url
    const getPar = makeParRequest({ wiaCryptoContext, appFetch });
    const issuerRequestUri = await getPar(
      clientId,
      codeVerifier,
      walletProviderBaseUrl,
      parUrl,
      walletInstanceAttestation,
      authorizationDetails,
      assertionType
    );

    //Start authentication vs RP. Return the client_id and request_uri for presentation
    const rpAuthenticationRequestResponse = await getRpAuthenticationRequest({
      appFetch,
    })(clientId, issuerRequestUri, credentialIssuerEntityConfiguration);

    return rpAuthenticationRequestResponse;
  };

// This is authorization post RP authentication
export const authorizeCredentialIssuing =
  ({ appFetch = fetch }: { appFetch?: GlobalFetch["fetch"] }) =>
  async (
    walletInstanceAttestation: string,
    walletProviderBaseUrl: string,
    credentialIssuerEntityConfiguration: EntityConfiguration,
    authenticationParams: RpAuthenticationRequestResponse,
    authorizationCode: string
  ): Promise<AuthorizationConf> => {
    //TODO: Obtain from entity configuration
    const credentialProviderBaseUrl =
      credentialIssuerEntityConfiguration.payload.iss;
    const tokenUrl = new URL("token", credentialProviderBaseUrl).href;

    // Use an ephemeral key to be destroyed after use
    const keytag = `ephemeral-${uuid.v4()}`;
    await generate(keytag);
    const ephemeralContext = createCryptoContextFor(keytag);

    const signedDPop = await createDPopToken(
      {
        htm: "POST",
        htu: tokenUrl,
        jti: `${uuid.v4()}`,
      },
      ephemeralContext
    );

    await deleteKey(keytag);

    const clientId = authenticationParams.client_id;
    const codeVerifier = `${uuid.v4()}`;
    const requestBody = {
      grant_type: "authorization code",
      client_id: clientId,
      code: authorizationCode,
      code_verifier: codeVerifier,
      client_assertion_type: assertionType,
      client_assertion: walletInstanceAttestation,
      redirect_uri: walletProviderBaseUrl,
    };
    var formBody = new URLSearchParams(requestBody);

    const response = await appFetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        DPoP: signedDPop,
      },
      body: formBody.toString(),
    });

    if (response.status === 200) {
      const { c_nonce, access_token } = await response.json();
      return {
        accessToken: access_token,
        nonce: c_nonce,
        clientId,
        codeVerifier,
        authorizationCode,
        walletProviderBaseUrl,
      };
    }
    throw new TokenError(
      `Unable to obtain token. Response code: ${await response.text()}`
    );
  };

export const getCredential =
  ({
    credentialCryptoContext,
    appFetch = fetch,
  }: {
    credentialCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }) =>
  async (
    { nonce, accessToken, clientId, walletProviderBaseUrl }: AuthorizationConf,
    credentialIssuerEntityConfiguration: EntityConfiguration
  ): Promise<any> => {
    //TODO: Obtain from entity configuration
    const credentialProviderBaseUrl =
      credentialIssuerEntityConfiguration.payload.iss;
    const tokenUrl = new URL("token", credentialProviderBaseUrl).href;
    const credentialUrl = new URL("credential", credentialProviderBaseUrl).href;

    const signedDPopForPid = await createDPopToken(
      {
        htm: "POST",
        htu: tokenUrl,
        jti: `${uuid.v4()}`,
      },
      credentialCryptoContext
    );
    const signedNonceProof = await createNonceProof(
      nonce,
      clientId,
      walletProviderBaseUrl,
      credentialCryptoContext
    );

    const requestBody = {
      credential_definition: JSON.stringify({
        type: ["mDL"],
      }),
      format: "vc+sd-jwt",
      proof: JSON.stringify({
        jwt: signedNonceProof,
        proof_type: "jwt",
      }),
    };
    const formBody = new URLSearchParams(requestBody);

    const response = await appFetch(credentialUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        DPoP: signedDPopForPid,
        Authorization: accessToken,
      },
      body: formBody.toString(),
    });

    if (response.status === 200) {
      return await response.json();
    }

    throw new Error(
      `Unable to obtain credential! url=${credentialUrl} status=${
        response.status
      } body=${await response.text()}`
    );
  };
