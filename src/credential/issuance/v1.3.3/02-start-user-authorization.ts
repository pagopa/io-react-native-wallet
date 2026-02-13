import {
  createPushedAuthorizationRequest,
  fetchPushedAuthorizationResponse,
  createClientAttestationPopJwt,
} from "@pagopa/io-wallet-oauth2";
import type { CallbackContext } from "@pagopa/io-wallet-oauth2";
import { LogLevel, Logger } from "../../../utils/logging";
import type { IssuanceApi } from "../api";
import { SignJWT } from "@pagopa/io-react-native-jwt";
import { partialCallbacks } from "src/utils/callbacks";
import {
  selectCredentialDefinition,
  selectResponseMode,
} from "../common/authorization";

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
