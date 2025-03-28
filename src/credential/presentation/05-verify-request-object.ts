import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import type { RelyingPartyEntityConfiguration } from "../../trust";
import { UnverifiedEntityError } from "./errors";
import { RequestObject } from "./types";
import { getJwksFromConfig } from "./04-retrieve-rp-jwks";

export type VerifyRequestObject = (
  requestObjectEncodedJwt: string,
  context: {
    clientId: string;
    rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"];
    rpSubject: string;
    state?: string;
  }
) => Promise<{ requestObject: RequestObject }>;

/**
 * Function to verify the Request Object's signature and the client ID.
 * @param requestObjectEncodedJwt The Request Object in JWT format
 * @param context.clientId The client ID to verify
 * @param context.rpConf The Entity Configuration of the Relying Party
 * @param context.state Optional state
 * @returns The verified Request Object
 */
export const verifyRequestObject: VerifyRequestObject = async (
  requestObjectEncodedJwt,
  { clientId, rpConf, rpSubject, state }
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

  const isClientIdMatch =
    clientId === requestObject.client_id && clientId === rpSubject;

  if (!isClientIdMatch) {
    throw new UnverifiedEntityError(
      "Client ID does not match Request Object or Entity Configuration"
    );
  }

  const isStateMatch =
    state && requestObject.state ? state === requestObject.state : true;

  if (!isStateMatch) {
    throw new UnverifiedEntityError("State does not match Request Object");
  }

  return { requestObject };
};
