import { UnverifiedEntityError } from "./errors";

import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import { RequestObject } from "./types";
import type { FetchJwks } from "./04-retrieve-rp-jwks";
import { type Out } from "../../utils/misc";

export type VerifyRequestObjectSignature = (
  requestObjectEncodedJwt: string,
  jwkKeys?: Out<FetchJwks>["keys"]
) => Promise<{ requestObject: RequestObject }>;

export const verifyRequestObjectSignature: VerifyRequestObjectSignature =
  async (requestObjectEncodedJwt, jwkKeys) => {
    const requestObjectJwt = decodeJwt(requestObjectEncodedJwt);
    let pubKey;

    // verify token signature to ensure the request object is authentic
    if (jwkKeys) {
      pubKey = jwkKeys.find(
        ({ kid }) => kid === requestObjectJwt.protectedHeader.kid
      );
    }

    if (!pubKey) {
      throw new UnverifiedEntityError("Request Object signature verification");
    }
    await verify(requestObjectEncodedJwt, pubKey);

    return { requestObject: RequestObject.parse(requestObjectJwt.payload) };
  };
