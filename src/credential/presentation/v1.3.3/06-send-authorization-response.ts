import {
  createAuthorizationResponse,
  fetchAuthorizationResponse,
} from "@pagopa/io-wallet-oid4vp";
import type { RemotePresentationApi } from "../api";
import { partialCallbacks } from "src/utils/callbacks";
import { assertRequestObjectV1_3, assertRpMetadataV1_3 } from "./types";
import { SignJWT, thumbprint } from "@pagopa/io-react-native-jwt";
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation/v1.0.0/utils";

export const sendAuthorizationResponse: RemotePresentationApi["sendAuthorizationResponse"] =
  async (requestObject, remotePresentations, rpConf, params) => {
    const { walletInstanceAttestation, wiaCryptoContext, context } = params;
    const appFetch = context?.appFetch ?? fetch;

    assertRequestObjectV1_3(requestObject);
    const rpMetadata = assertRpMetadataV1_3(rpConf);

    if (!walletInstanceAttestation) {
      throw new Error(
        "Wallet Instance Attestation is required to send the authorization response"
      );
    }

    if (!wiaCryptoContext) {
      throw new Error(
        "WIA CryptoContext is required to send the authorization response"
      );
    }

    const decodedWia = WalletInstanceAttestation.decode(
      walletInstanceAttestation
    );

    const wiaThumbprint = await thumbprint(decodedWia.payload.cnf.jwk);
    const signerJwk = await wiaCryptoContext.getPublicKey();

    const vp_token = remotePresentations.reduce(
      (acc, p) => {
        (acc[p.credentialId] ??= []).push(p.vpToken);
        return acc;
      },
      {} as Record<string, string[]>
    );

    const { jarm } = await createAuthorizationResponse({
      requestObject,
      rpMetadata: rpMetadata,
      client_id: wiaThumbprint,
      vp_token,
      callbacks: {
        ...partialCallbacks,
        fetch: appFetch,
        signJwt: async (_, payload) => ({
          jwt: await new SignJWT(wiaCryptoContext).setPayload(payload).sign(),
          signerJwk,
        }),
      },
    });

    if (!jarm?.responseJwt) {
      throw new Error("Missing JARM responseJwt");
    }

    const redirectUri = await fetchAuthorizationResponse({
      authorizationResponseJarm: jarm.responseJwt,
      presentationResponseUri: requestObject.response_uri,
      callbacks: { fetch: appFetch },
    });

    return redirectUri;
  };
