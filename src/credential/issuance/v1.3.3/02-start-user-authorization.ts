import {
  createPushedAuthorizationRequest,
  fetchPushedAuthorizationResponse,
  createClientAttestationPopJwt,
} from "@pagopa/io-wallet-oauth2";
import type { CallbackContext } from "@pagopa/io-wallet-oauth2";
import { AuthorizationDetail } from "../../../utils/par";
import { LogLevel, Logger } from "../../../utils/logging";
import type { IssuerConfig } from "../api/IssuerConfig";
import type { IssuanceApi } from "../api";
import type { ResponseMode } from "./types";
import { SignJWT } from "@pagopa/io-react-native-jwt";
import { partialCallbacks } from "src/utils/callbacks";

/**
 * Ensures that the credential type requested is supported by the issuer and contained in the
 * issuer configuration.
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param credentialId The credential configuration ID to be requested;
 * @returns The credential definition to be used in the request which includes the format and the type and its type
 */
const selectCredentialDefinition = (
  issuerConf: IssuerConfig,
  credentialId: string
): AuthorizationDetail => {
  const credential_configurations_supported =
    issuerConf.credential_configurations_supported;

  const [result] = Object.keys(credential_configurations_supported)
    .filter((e) => e.includes(credentialId))
    .map(() => ({
      credential_configuration_id: credentialId,
      type: "openid_credential" as const,
    }));

  if (!result) {
    Logger.log(
      LogLevel.ERROR,
      `Requested credential ${credentialId} is not supported by the issuer according to its configuration ${JSON.stringify(credential_configurations_supported)}`
    );
    throw new Error(`No credential support the type '${credentialId}'`);
  }
  return result;
};

/**
 * Ensures that the response mode requested is supported by the issuer and contained in the issuer configuration.
 * When multiple credentials are provided, all of them must support the same response_mode.
 * @param issuerConf The issuer configuration
 * @param credentialIds The credential configuration IDs to be requested
 * @returns The response mode to be used in the request, "query" for PersonIdentificationData and "form_post.jwt" for all other types.
 */
const selectResponseMode = (
  issuerConf: IssuerConfig,
  credentialIds: string[]
): ResponseMode => {
  const responseModeSet = new Set<ResponseMode>();

  for (const credentialId of credentialIds) {
    responseModeSet.add(
      credentialId.match(/PersonIdentificationData/i)
        ? "query"
        : "form_post.jwt"
    );
  }

  if (responseModeSet.size !== 1) {
    Logger.log(
      LogLevel.ERROR,
      `${credentialIds} have incompatible response_mode: ${[...responseModeSet.values()]}`
    );
    throw new Error(
      "Requested credentials have incompatible response_mode and cannot be requested with the same PAR request"
    );
  }

  const [responseMode] = responseModeSet.values();

  Logger.log(
    LogLevel.DEBUG,
    `Selected response mode ${responseMode} for credential IDs ${credentialIds}`
  );

  const responseModeSupported = issuerConf.response_modes_supported;
  if (responseModeSupported && !responseModeSupported.includes(responseMode!)) {
    Logger.log(
      LogLevel.ERROR,
      `Requested response mode ${responseMode} is not supported by the issuer according to its configuration ${JSON.stringify(responseModeSupported)}`
    );
    throw new Error(`No response mode support for IDs '${credentialIds}'`);
  }

  return responseMode!;
};

/* -------------------- Public API implementation -------------------- */

export const startUserAuthorization: IssuanceApi["startUserAuthorization"] =
  async (issuerConf, credentialIds, proof, ctx) => {
    const {
      wiaCryptoContext,
      walletInstanceAttestation,
      redirectUri,
      appFetch = fetch,
    } = ctx;

    const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);

    if (!clientId) {
      Logger.log(
        LogLevel.ERROR,
        `Public key associated with kid ${clientId} not found in the device`
      );
      throw new Error("No public key found");
    }

    const responseMode = selectResponseMode(issuerConf, credentialIds);

    const credentialDefinition = credentialIds.map((c) =>
      selectCredentialDefinition(issuerConf, c)
    );

    if (proof.proofType === "mrtd-pop") {
      /**
       * When we requests a PID using eID Substantial Authentication with MRTD Verification, we must include
       * an additional Authorization Details Object in the authorization_details
       *
       * See https://italia.github.io/eid-wallet-it-docs/versione-corrente/en/credential-issuance-endpoint.html#pushed-authorization-request-endpoint
       */
      credentialDefinition.push({
        type: "it_l2+document_proof",
        idphinting: proof.idpHinting,
        challenge_method: "mrtd+ias",
        challenge_redirect_uri: redirectUri,
      });
    }

    const signerJwk = await wiaCryptoContext.getPublicKey();
    const signJwt: CallbackContext["signJwt"] = async (_, payload) => ({
      jwt: await new SignJWT(wiaCryptoContext).setPayload(payload).sign(),
      signerJwk,
    });

    const parRequest = await createPushedAuthorizationRequest({
      callbacks: {
        ...partialCallbacks,
        signJwt,
      },
      authorizationServerMetadata: {
        require_signed_request_object: true,
      },
      clientId,
      audience: issuerConf.credential_issuer,
      authorization_details: credentialDefinition,
      codeChallengeMethodsSupported: ["S256"],
      responseMode,
      redirectUri,
    });

    const clientAttestationPoP = await createClientAttestationPopJwt({
      callbacks: {
        signJwt,
      },
      clientAttestation: walletInstanceAttestation,
      authorizationServer: issuerConf.authorization_endpoint,
      signer: {
        method: "jwk",
        alg: "ES256",
        publicJwk: signerJwk,
      },
    });

    const { request_uri } = await fetchPushedAuthorizationResponse({
      callbacks: {
        fetch: appFetch,
      },
      pushedAuthorizationRequestEndpoint:
        issuerConf.pushed_authorization_request_endpoint,
      pushedAuthorizationRequest: parRequest,
      clientAttestationDPoP: clientAttestationPoP,
      walletAttestation: walletInstanceAttestation,
    });

    return {
      issuerRequestUri: request_uri,
      clientId,
      codeVerifier: parRequest.pkceCodeVerifier,
      credentialDefinition,
    };
  };
