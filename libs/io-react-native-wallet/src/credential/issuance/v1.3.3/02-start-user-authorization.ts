import type { JwtSignerJwk } from "@pagopa/io-wallet-oauth2";

import {
  createClientAttestationPopJwt,
  createPushedAuthorizationRequest,
  fetchPushedAuthorizationResponse,
} from "@pagopa/io-wallet-oauth2";
import { v4 as uuidv4 } from "uuid";

import type { IssuanceApi } from "../api";

import {
  createSignJwtFromCryptoContext,
  partialCallbacks,
} from "../../../utils/callbacks";
import { sdkConfigV1_3 } from "../../../utils/config";
import { IoWalletError } from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import { selectCredentialDefinition } from "../common/02-start-user-authorization";

export const startUserAuthorization: IssuanceApi["startUserAuthorization"] =
  async (issuerConf, credentialIds, proof, ctx) => {
    const {
      appFetch = fetch,
      issuerState,
      redirectUri,
      scope,
      walletInstanceAttestation,
      wiaCryptoContext,
    } = ctx;

    const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);

    if (!clientId) {
      Logger.log(
        LogLevel.ERROR,
        `Public key associated with kid ${clientId} not found in the device`,
      );
      throw new IoWalletError("No public key found");
    }

    const credentialDefinition = credentialIds.map((c) =>
      selectCredentialDefinition(issuerConf, c),
    );

    if (proof.proofType === "mrtd-pop") {
      /**
       * When we requests a PID using eID Substantial Authentication with MRTD Verification, we must include
       * an additional Authorization Details Object in the authorization_details
       *
       * See https://italia.github.io/eid-wallet-it-docs/versione-corrente/en/credential-issuance-endpoint.html#pushed-authorization-request-endpoint
       */
      credentialDefinition.push({
        challenge_method: "mrtd+ias",
        challenge_redirect_uri: redirectUri,
        idphinting: proof.idpHinting,
        type: "it_l2+document_proof",
      });
    }

    const wiaSigner: JwtSignerJwk = {
      alg: "ES256",
      method: "jwk",
      publicJwk: await wiaCryptoContext.getPublicKey(),
    };

    const signJwt = createSignJwtFromCryptoContext(wiaCryptoContext);

    const parRequest = await createPushedAuthorizationRequest({
      audience: issuerConf.credential_issuer,
      authorization_details: credentialDefinition,
      authorizationServerMetadata: {
        require_signed_request_object: true,
      },
      callbacks: {
        ...partialCallbacks,
        signJwt,
      },
      clientId,
      codeChallengeMethodsSupported: ["S256"],
      config: sdkConfigV1_3,
      dpop: {
        signer: wiaSigner,
      },
      issuerState,
      jti: uuidv4(),
      redirectUri,
      // When the issuance is started from a Credential Offer, the `scope` and
      // `issuer_state` carried by the authorization_code grant are forwarded to
      // the PAR. They are `undefined` (and thus omitted) for the regular flow.
      scope,
    });

    const clientAttestationPoP = await createClientAttestationPopJwt({
      authorizationServer: issuerConf.credential_issuer,
      callbacks: {
        generateRandom: partialCallbacks.generateRandom,
        signJwt,
      },
      clientAttestation: walletInstanceAttestation,
      config: sdkConfigV1_3,
      jti: uuidv4(),
      signer: wiaSigner,
    });

    const { request_uri } = await fetchPushedAuthorizationResponse({
      callbacks: {
        fetch: appFetch,
      },
      clientAttestationDPoP: clientAttestationPoP,
      pushedAuthorizationRequest: parRequest,
      pushedAuthorizationRequestEndpoint:
        issuerConf.pushed_authorization_request_endpoint,
      walletAttestation: walletInstanceAttestation,
    });

    return {
      clientId,
      codeVerifier: parRequest.pkceCodeVerifier,
      credentialDefinition,
      issuerRequestUri: request_uri,
    };
  };
