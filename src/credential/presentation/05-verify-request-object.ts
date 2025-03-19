import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import type { RelyingPartyEntityConfiguration } from "../../trust";
import { UnverifiedEntityError } from "./errors";
import { RequestObject } from "./types";
import { getJwksFromConfig } from "./04-retrieve-rp-jwks";

export type VerifyRequestObject = (
  requestObjectEncodedJwt: string,
  context: {
    clientId: string;
    // jwkKeys: Out<FetchJwks>["keys"];
    rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"];
  }
) => Promise<{ requestObject: RequestObject }>;

/**
 * Function to verify the Request Object's signature and the client ID.
 * @param requestObjectEncodedJwt The Request Object in JWT format
 * @param context.clientId The client ID to verify
 * @param context.jwkKeys The set of keys to verify the signature
 * @param context.rpConf The Entity Configuration of the Relying Party
 * @returns The verified Request Object
 */
export const verifyRequestObject: VerifyRequestObject = async (
  requestObjectEncodedJwt,
  { clientId, rpConf }
) => {
  const requestObjectJwt = decodeJwt(requestObjectEncodedJwt);
  const { keys } = getJwksFromConfig(rpConf);

  // Verify token signature to ensure the request object is authentic
  const pubKey = keys?.find(
    ({ kid }) => kid === requestObjectJwt.protectedHeader.kid
  );

  if (!pubKey) {
    throw new UnverifiedEntityError("Request Object signature verification!");
  }

  // Standard claims are verified within `verify`
  await verify(requestObjectEncodedJwt, pubKey, { issuer: clientId });

  const requestObject = RequestObject.parse(requestObjectJwt.payload);

  if (
    !((clientId === requestObject.client_id) /* && clientId === rpConf.sub */)
  ) {
    throw new UnverifiedEntityError(
      "Client ID does not match Request Object or Entity Configuration"
    );
  }

  return { requestObject };
};
