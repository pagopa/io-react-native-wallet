import { generateRandomAlphaNumericString } from "../../../utils/misc";
import { makeParRequest } from "../../../utils/par";
import { LogLevel, Logger } from "../../../utils/logging";
import type { IssuanceApi } from "../api";
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
    const codeVerifier = generateRandomAlphaNumericString(64);
    const parEndpoint = issuerConf.pushed_authorization_request_endpoint;
    const aud = issuerConf.credential_issuer;
    const responseMode = selectResponseMode(issuerConf, credentialIds);
    const getPar = makeParRequest({ wiaCryptoContext, appFetch });

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

    const issuerRequestUri = await getPar(
      parEndpoint,
      walletInstanceAttestation,
      {
        aud,
        clientId,
        codeVerifier,
        redirectUri,
        responseMode,
        authorizationDetails: credentialDefinition,
      }
    );

    return { issuerRequestUri, clientId, codeVerifier, credentialDefinition };
  };
