import { ISO18013_7 } from "@pagopa/io-react-native-iso18013";
import { removePadding, thumbprint } from "@pagopa/io-react-native-jwt";
import { b64utob64 } from "jsrsasign";

import type { EvaluatedCredential } from "./04-evaluate-dcql-query";

import { prepareVpToken } from "../../sd-jwt";
import { createCryptoContextFor } from "../../utils/crypto";
import { IoWalletError } from "../../utils/errors";
import {
  type AuthorizationErrorCode,
  type AuthorizationResponseResult,
  type RequestObject,
} from "./types";
import { getEncryptionJwk, postAuthorizationResponse } from "./utils";

/**
 * Presents the credentials the user consented to share, sending the Authorization Response
 * to the Verifier (OpenID4VP 1.0, Section 8). The `vp_token` maps each DCQL Credential Query
 * id to its presentations (Section 8.1):
 * - `dc+sd-jwt`: SD-JWT VC with the requested disclosures and a Key Binding JWT (Appendix B.3.6);
 * - `mso_mdoc`: DeviceResponse whose SessionTranscript has the `OpenID4VPHandover` (Appendix B.2.6.1).
 *
 * With `direct_post.jwt`, the response is encrypted with a key of the Verifier (Section 8.3).
 *
 * @param requestObject - The verified Request Object
 * @param credentials - The credentials to present, chosen among the candidates evaluated by {@link evaluateDcqlQuery}
 * @param callbacks.fetch - (optional) The fetch implementation, defaults to the global one
 * @returns The Verifier response, with the `redirect_uri` to open, if any
 * @throws {IoWalletError} If a credential format is not supported or the response cannot be encrypted
 * @throws {RelyingPartyResponseError} If the Verifier rejects the response
 */
export const sendAuthorizationResponse = async (
  requestObject: RequestObject,
  credentials: EvaluatedCredential[],
  callbacks: { fetch?: typeof fetch } = {},
): Promise<AuthorizationResponseResult> => {
  const { fetch: fetchFn = fetch } = callbacks;
  const { client_id, nonce, response_mode, response_uri } = requestObject;

  const encryptionJwk =
    response_mode === "direct_post.jwt"
      ? getEncryptionJwk(requestObject.client_metadata)
      : undefined;
  // The mdoc SessionTranscript is bound to the key encrypting the response
  const jwkThumbprint = encryptionJwk ? await thumbprint(encryptionJwk) : null;

  const presentations = await Promise.all(
    credentials.map(async (item) => {
      const cryptoContext = createCryptoContextFor(item.keyTag);
      switch (item.format) {
        case "dc+sd-jwt": {
          const { vp_token } = await prepareVpToken(nonce, client_id, [
            item.credential,
            item.presentationFrame,
            cryptoContext,
          ]);
          return [item.id, vp_token] as const;
        }
        case "mso_mdoc": {
          const deviceResponse = await ISO18013_7.generateOID4VPDeviceResponse(
            client_id,
            response_uri,
            nonce,
            jwkThumbprint,
            [
              {
                alias: item.keyTag,
                docType: item.doctype,
                issuerSignedContent: b64utob64(item.credential),
              },
            ],
            item.presentationFrame as ISO18013_7.AcceptedFields,
          );
          // The vp_token carries the DeviceResponse base64url encoded
          return [item.id, removePadding(deviceResponse)] as const;
        }
        default: {
          // Unreachable for evaluated credentials, guards credentials built by the caller
          const { format } = item as { format: string };
          throw new IoWalletError(`${format} format is not supported`);
        }
      }
    }),
  );

  const vpToken = presentations.reduce<Record<string, string[]>>(
    (acc, [id, presentation]) => {
      (acc[id] ??= []).push(presentation);
      return acc;
    },
    {},
  );

  return postAuthorizationResponse(
    requestObject,
    { vp_token: vpToken },
    fetchFn,
    encryptionJwk,
  );
};

/**
 * Sends an error Authorization Response to the Verifier (OpenID4VP 1.0, Section 8.5),
 * e.g. `access_denied` when the user refuses to present the credentials.
 *
 * @param requestObject - The verified Request Object
 * @param error - The error code and its description
 * @param callbacks.fetch - (optional) The fetch implementation, defaults to the global one
 * @returns The Verifier response, with the `redirect_uri` to open, if any
 * @throws {RelyingPartyResponseError} If the Verifier rejects the response
 */
export const sendAuthorizationErrorResponse = (
  requestObject: RequestObject,
  error: { code: AuthorizationErrorCode; description?: string },
  callbacks: { fetch?: typeof fetch } = {},
): Promise<AuthorizationResponseResult> =>
  postAuthorizationResponse(
    requestObject,
    {
      error: error.code,
      ...(error.description && { error_description: error.description }),
    },
    callbacks.fetch ?? fetch,
  );
