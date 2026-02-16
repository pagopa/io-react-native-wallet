import type { RemotePresentationApi } from "../api";
import { parseAuthorizeRequest as sdkParseAuthorizeRequest } from "@pagopa/io-wallet-oid4vp";
import { partialCallbacks } from "src/utils/callbacks";
import { mapToRequestObject } from "./mappers";
import { InvalidRequestObjectError } from "../common/errors";
import { RequestObjectPayload } from "./types";

export const verifyRequestObject: RemotePresentationApi["verifyRequestObject"] =
  async (requestObjectEncodedJwt) => {
    try {
      const parsedRequestObject = await sdkParseAuthorizeRequest({
        requestObjectJwt: requestObjectEncodedJwt,
        callbacks: {
          verifyJwt: partialCallbacks.verifyJwt,
        },
      });

      const payload = RequestObjectPayload.parse(parsedRequestObject.payload);

      return {
        requestObject: mapToRequestObject(payload),
      };
    } catch (e) {
      throw new InvalidRequestObjectError(
        e instanceof Error ? e.message : "Invalid Request Object"
      );
    }
  };
