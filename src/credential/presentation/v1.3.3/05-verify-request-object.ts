import {
  ClientIdPrefix,
  extractClientIdPrefix,
  parseAuthorizeRequest as sdkParseAuthorizeRequest,
} from "@pagopa/io-wallet-oid4vp";
import QuickCrypto from "react-native-quick-crypto";

import type { RelyingPartyConfig, RemotePresentationApi } from "../api";
import type { RawRequestObject } from "./types";

import { partialCallbacks } from "../../../utils/callbacks";
import { sdkConfigV1_3 } from "../../../utils/config";
import { IoWalletError } from "../../../utils/errors";
import { InvalidRequestObjectError } from "../common/errors";
import { mapToRequestObject } from "./mappers";
import { mapSdkRequestObjectError } from "./sdkErrorMapper";

export const verifyRequestObject: RemotePresentationApi["verifyRequestObject"] =
  async (requestObjectEncodedJwt, { clientId: fullClientId, rpConf }) => {
    const parsedRequestObject = await sdkParseAuthorizeRequest({
      callbacks: {
        verifyJwt: partialCallbacks.verifyJwt,
      },
      config: sdkConfigV1_3,
      requestObjectJwt: requestObjectEncodedJwt,
    }).catch(mapSdkRequestObjectError);

    const rawRequestObject = parsedRequestObject as RawRequestObject;

    const { clientId, prefix } = extractClientIdPrefix(fullClientId);

    if (prefix === ClientIdPrefix.X509_HASH) {
      validateX509HashClient(rawRequestObject.header.x5c, clientId);
    }

    if (
      prefix === ClientIdPrefix.OPENID_FEDERATION ||
      prefix === ClientIdPrefix.NONE
    ) {
      validateOpenIDFederationClient(
        rawRequestObject,
        fullClientId,
        clientId,
        rpConf,
      );
    }

    return {
      requestObject: mapToRequestObject(rawRequestObject),
    };
  };

const validateOpenIDFederationClient = (
  requestObject: RawRequestObject,
  fullClientId: string,
  clientId: string,
  rpConf: RelyingPartyConfig | undefined,
) => {
  if (!rpConf) {
    throw new IoWalletError(
      "Relying Party Configuration is required for OpenID Federation clients",
    );
  }

  const isClientIdMatch =
    fullClientId === requestObject.payload.client_id &&
    clientId === rpConf.subject;

  if (!isClientIdMatch) {
    throw new InvalidRequestObjectError(
      "Client ID does not match Request Object or Entity Configuration",
    );
  }
};

const validateX509HashClient = (
  certificateChain: string[],
  x509Hash: string,
) => {
  const calculatedHash = QuickCrypto.createHash("sha-256")
    .update(certificateChain[0]!, "base64")
    .digest("base64url");

  if (x509Hash !== calculatedHash) {
    throw new InvalidRequestObjectError(
      "x509_hash does not match the hash of the x5c leaf certificate",
    );
  }
};
