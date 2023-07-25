import { SignJWT } from "@pagopa/io-react-native-jwt";

export const getSignedJwt = async (unsignedJwt: string, signature: string) =>
  await SignJWT.appendSignature(unsignedJwt, signature);
