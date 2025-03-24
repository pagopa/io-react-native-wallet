import {
  decode as decodeJwt,
  verify as verifyJwt,
} from "@pagopa/io-react-native-jwt";

import type { JWK, JWTDecodeResult } from "../utils/jwk";

export type ParsedToken = {
  header: JWTDecodeResult["protectedHeader"];
  payload: JWTDecodeResult["payload"];
};

// Verify a token signature
// The kid is extracted from the token header
export const verify = async (
  token: string,
  kid: string,
  jwks: JWK[]
): Promise<ParsedToken> => {
  const jwk = jwks.find((k) => k.kid === kid);
  if (!jwk) {
    throw new Error(`Invalid kid: ${kid}, token: ${token}`);
  }
  const { protectedHeader: header, payload } = await verifyJwt(token, jwk);
  return { header, payload };
};

export const decode = (token: string): ParsedToken => {
  const { protectedHeader: header, payload } = decodeJwt(token);
  return { header, payload };
};
