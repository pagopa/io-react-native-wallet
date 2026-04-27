import {
  createPushedAuthorizationRequest,
  fetchPushedAuthorizationResponse,
  createClientAttestationPopJwt,
} from "@pagopa/io-wallet-oauth2";
import type { JwtSignerJwk } from "@pagopa/io-wallet-oauth2";
import { LogLevel, Logger } from "../../../utils/logging";
import type { IssuanceApi } from "../api";
import {
  createSignJwtFromCryptoContext,
  partialCallbacks,
} from "../../../utils/callbacks";
import { IoWalletError } from "../../../utils/errors";
import {
  selectCredentialDefinition,
  selectResponseMode,
} from "../common/02-start-user-authorization";

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
      throw new IoWalletError("No public key found");
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

    const wiaSigner: JwtSignerJwk = {
      method: "jwk",
      alg: "ES256",
      publicJwk: await wiaCryptoContext.getPublicKey(),
    };

    const signJwt = createSignJwtFromCryptoContext(wiaCryptoContext);

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
      dpop: {
        signer: wiaSigner,
      },
    });

    const clientAttestationPoP = await createClientAttestationPopJwt({
      callbacks: {
        generateRandom: partialCallbacks.generateRandom,
        signJwt,
      },
      clientAttestation: walletInstanceAttestation,
      authorizationServer: issuerConf.authorization_endpoint,
      signer: wiaSigner,
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
