import { decode, verify } from "@pagopa/io-react-native-jwt";
import { ParsedLoTE, validateWRPAC, WRPAC } from "@pagopa/io-wallet-eudi-trust";
import { ValidationFailed } from "../../utils/errors";
import { trustCallbacks } from "./callbacks";
import { JWTDecodeResult } from "../../utils/jwk";

type VerifyJwtWithWRPAC = (
  params: {
    jwt: { compact: string; decoded?: JWTDecodeResult },
    wrpacLote: ParsedLoTE
  },
) => Promise<{
  header: JWTDecodeResult["protectedHeader"];
  payload: JWTDecodeResult["payload"];
  wrpac: WRPAC;
}>

/**
 * Verifies the signature of a JWT with WRPAC validation.
 * 
 * The function takes the JWT and a validated WRPAC providers LoTE:
 * the WRPAC is validated with one of the Trust Anchors in the LoTE,
 * then its public key is used to verify the JWT's signature.
 * 
 * **Note:** this function DOES NOT perform LoTE validation.
 * 
 * @param params.jwt.compact The JWT to verify (must include the WRPAC in `x5c`)
 * @param params.jwt.decoded (optional) The decoded JWT; if not provided, the JWT is decoded in the function
 * @param params.wrpacLote The WRPAC providers LoTE
 * @returns The verified JWT and WRPAC
 */
export const verifyJwtWithWRPAC: VerifyJwtWithWRPAC = async (
  { wrpacLote, jwt },
) => {
  const { protectedHeader, payload } = jwt.decoded ?? decode(jwt.compact);

  if (!protectedHeader.x5c) {
    throw new ValidationFailed({ message: "JWT header is missing x5c with WRPAC" })
  }

  const { wrpac } = await validateWRPAC({
    callbacks: trustCallbacks,
    wrpacLote,
    wrpacChain: protectedHeader.x5c as [string, ...string[]],
  });

  await verify(jwt.compact, wrpac.publicJwk);

  return { header: protectedHeader, payload, wrpac }
};
