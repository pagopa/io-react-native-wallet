import type { RemotePresentationApi } from "../api";
import { parseAuthorizeRequest as sdkParseAuthorizeRequest } from "@pagopa/io-wallet-oid4vp";
import { partialCallbacks } from "src/utils/callbacks";
import { mapToRequestObject } from "./mappers";
import { mapSdkRequestObjectError } from "./errors";
import { validateWithSchema } from "../common/utils";
import { RequestObjectPayload } from "./types";
import { InvalidRequestObjectError } from "../common/errors";

export const verifyRequestObject: RemotePresentationApi["verifyRequestObject"] =
  async (requestObjectEncodedJwt, { clientId, rpConf }) => {
    const parsedRequestObject = await sdkParseAuthorizeRequest({
      requestObjectJwt: requestObjectEncodedJwt,
      callbacks: {
        verifyJwt: partialCallbacks.verifyJwt,
      },
    }).catch(mapSdkRequestObjectError);

    const payload = validateWithSchema(
      RequestObjectPayload,
      parsedRequestObject.payload,
      (message, reason) => new InvalidRequestObjectError(message, reason),
      "The Request Object cannot be parsed successfully"
    );

    const isClientIdMatch =
    clientId === payload.client_id && clientId === rpConf.subject;

  if (!isClientIdMatch) {
    throw new InvalidRequestObjectError(
      "Client ID does not match Request Object or Entity Configuration"
    );
  }

    return {
      requestObject: mapToRequestObject(payload),
    };
  };
