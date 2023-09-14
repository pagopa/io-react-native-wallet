import {
  decode as decodeJwt,
  verify as verifyJwt,
} from "@pagopa/io-react-native-jwt";
import {
  EntityConfiguration,
  EntityStatement,
  TrustAnchorEntityConfiguration,
} from "./types";
import { JWK } from "../utils/jwk";
import { IoWalletError } from "../utils/errors";
import * as z from "zod";
import type { JWTDecodeResult } from "@pagopa/io-react-native-jwt/lib/typescript/types";

type ParsedToken = {
  header: JWTDecodeResult["protectedHeader"];
  payload: JWTDecodeResult["payload"];
};

// Verify a token signature
// The kid is extracted from the token header
const verify = async (
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

const decode = (token: string) => {
  const { protectedHeader: header, payload } = decodeJwt(token);
  return { header, payload };
};

// The first element of the chain is supposed to be the Entity Configuration for the document issuer
const FirstElementShape = EntityConfiguration;
// Each element but the first is supposed to be an Entity Statement
const MiddleElementShape = EntityStatement;
// The last element of the chain can either be an Entity Statement
//  or the Entity Configuration for the known Trust Anchor
const LastElementShape = z.union([
  EntityStatement,
  TrustAnchorEntityConfiguration,
]);

/**
 * Validates a provided trust chain against a known trust
 *
 * @param trustAnchorEntity
 * @param chain
 * @returns The list of parsed token representing the chain
 * @throws {IoWalletError} If the chain is not valid
 */
export async function verifyTrustChain(
  trustAnchorEntity: TrustAnchorEntityConfiguration,
  chain: string[]
): Promise<ParsedToken[]> {
  // If the chain is empty, fail
  if (chain.length === 0) {
    throw new IoWalletError("Cannot verify empty trust chain");
  }

  // Select the expected token shape
  const selectTokenShape = (elementIndex: number) =>
    elementIndex === 0
      ? FirstElementShape
      : elementIndex === chain.length - 1
      ? LastElementShape
      : MiddleElementShape;

  // select the kid from the current index
  const selectKid = (currentIndex: number): string => {
    const token = chain[currentIndex];
    if (!token) {
      throw new IoWalletError(`Cannot select kid: empty token`);
    }
    const shape = selectTokenShape(currentIndex);
    return shape.parse(decode(token)).header.kid;
  };

  // select keys from the next token
  // if the current token is the last, keys fro  trust anchor will be used
  const selectKeys = (currentIndex: number): JWK[] => {
    if (currentIndex === chain.length - 1) {
      return trustAnchorEntity.payload.jwks.keys;
    }

    const nextIndex = currentIndex + 1;
    const nextToken = chain[nextIndex];
    if (!nextToken) {
      throw new IoWalletError(`Cannot select keys: empty nextToken`);
    }
    const shape = selectTokenShape(nextIndex);
    return shape.parse(decode(nextToken)).payload.jwks.keys;
  };

  // Iterate the chain and validate each element's signature against the public keys of its next
  // If there is no next, hence it's the end of the chain and it must be verified by the Trust Anchor
  return Promise.all(
    chain
      .map((token, i) => [token, selectKid(i), selectKeys(i)] as const)
      .map((args) => verify(...args))
  );
}
