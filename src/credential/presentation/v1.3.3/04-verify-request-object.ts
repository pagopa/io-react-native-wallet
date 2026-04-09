import type { RemotePresentationApi } from "../api";
import { parseAuthorizeRequest as sdkParseAuthorizeRequest } from "@pagopa/io-wallet-oid4vp";
import { partialCallbacks } from "../../../utils/callbacks";
import { sdkConfigV1_3 } from "../../../utils/config";
import { InvalidRequestObjectError } from "../common/errors";
import { mapSdkRequestObjectError } from "./sdkErrorMapper";
import { mapToRequestObject } from "./mappers";

export const verifyRequestObject: RemotePresentationApi["verifyRequestObject"] =
  async (requestObjectEncodedJwt, { clientId, rpConf }) => {
    const parsedRequestObject = await sdkParseAuthorizeRequest({
      config: sdkConfigV1_3,
      requestObjectJwt: requestObjectEncodedJwt,
      callbacks: {
        verifyJwt: partialCallbacks.verifyJwt,
      },
    }).catch(mapSdkRequestObjectError);

    const payload = parsedRequestObject.payload;

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
