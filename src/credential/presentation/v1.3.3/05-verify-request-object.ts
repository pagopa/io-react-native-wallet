import type { RelyingPartyConfig, RemotePresentationApi } from "../api";
import {
  parseAuthorizeRequest as sdkParseAuthorizeRequest,
  ClientIdPrefix,
  extractClientIdPrefix,
} from "@pagopa/io-wallet-oid4vp";
import QuickCrypto from "react-native-quick-crypto";
import { partialCallbacks } from "../../../utils/callbacks";
import { sdkConfigV1_3 } from "../../../utils/config";
import { assert } from "../../../utils/misc";
import { InvalidRequestObjectError } from "../common/errors";
import { mapSdkRequestObjectError } from "./sdkErrorMapper";
import { mapToRequestObject } from "./mappers";
import type { RawRequestObject } from "./types";

export const verifyRequestObject: RemotePresentationApi["verifyRequestObject"] =
  async (requestObjectEncodedJwt, { clientId, rpConf }) => {
    const parsedRequestObject = await sdkParseAuthorizeRequest({
      config: sdkConfigV1_3,
      requestObjectJwt: requestObjectEncodedJwt,
      callbacks: {
        verifyJwt: partialCallbacks.verifyJwt,
      },
    }).catch(mapSdkRequestObjectError);

    const rawRequestObject = parsedRequestObject as RawRequestObject;

    const clientIdPrefix = extractClientIdPrefix(clientId);

    if (clientIdPrefix === ClientIdPrefix.X509_HASH) {
      validateX509HashClient(rawRequestObject.header.x5c, clientId);
    }

    if (
      clientIdPrefix === ClientIdPrefix.OPENID_FEDERATION ||
      clientIdPrefix === ClientIdPrefix.NONE
    ) {
      validateOpenIDFederationClient(rawRequestObject, clientId, rpConf);
    }

    return {
      requestObject: mapToRequestObject(rawRequestObject),
    };
  };

const validateOpenIDFederationClient = (
  requestObject: RawRequestObject,
  clientId: string,
  rpConf?: RelyingPartyConfig
) => {
  assert(
    rpConf,
    "Relying Party Configuration is required for OpenID Federation clients"
  );

  const isClientIdMatch =
    clientId === requestObject.payload.client_id && clientId === rpConf.subject;

  if (!isClientIdMatch) {
    throw new InvalidRequestObjectError(
      "Client ID does not match Request Object or Entity Configuration"
    );
  }
};

const validateX509HashClient = (
  certificateChain: string[],
  clientId: string
) => {
  const [, x509Hash] = clientId.split(":");

  const calculatedHash = QuickCrypto.createHash("sha-256")
    .update(certificateChain[0]!, "base64")
    .digest("base64url");

  if (x509Hash !== calculatedHash) {
    throw new InvalidRequestObjectError(
      "x509_hash does not match the hash of the x5c leaf certificate"
    );
  }
};
