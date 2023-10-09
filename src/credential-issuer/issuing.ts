import { type CryptoContext } from "@pagopa/io-react-native-jwt";

import uuid from "react-native-uuid";
import { PidIssuingError } from "../utils/errors";

import * as z from "zod";

import { makeParRequest, type AuthorizationDetails } from "../utils/par";
import { getJwtFromFormPost } from "../utils/decoder";
import type { EntityConfiguration } from "../trust/types";

export type AuthorizationConf = {
  accessToken: string;
  nonce: string;
  clientId: string;
  authorizationCode: string;
  codeVerifier: string;
  walletProviderBaseUrl: string;
};

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

/**
 * Start the issuing flow by generating an authorization request to the PID Provider. Obtain from the PID Provider an access token to be used to complete the issuing flow.
 *
 * @param params.wiaCryptoContext The key pair associated with the WIA. Will be use to prove the ownership of the attestation.
 * @param params.appFetch (optional) Http client
 * @param walletInstanceAttestation Wallet Instance Attestation token.
 * @param walletProviderBaseUrl Base url for the Wallet Provider.
 * @param pidProviderEntityConfiguration The Entity Configuration of the PID Provider, from which discover public endooints.
 * @returns The access token along with the values that identify the issuing session.
 */
export const authorizeIssuing =
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
    const tokenUrl = new URL("token", credentialProviderBaseUrl).href;
    const parUrl = new URL("/as/par", credentialProviderBaseUrl).href;
    console.log(tokenUrl, parUrl);

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
    return await getRpAuthenticationRequest({ appFetch })(
      clientId,
      issuerRequestUri,
      credentialIssuerEntityConfiguration
    );
  };
