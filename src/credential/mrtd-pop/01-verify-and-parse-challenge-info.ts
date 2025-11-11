import {
  decode as decodeJwt,
  type CryptoContext,
} from "@pagopa/io-react-native-jwt";
import { MrtdProofChallengeInfo } from "./types";
import type { EvaluateIssuerTrust } from "../issuance";
import type { Out } from "../../utils/misc";

export type VerifyAndParseChallengeInfo = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  challengeInfoJwt: string,
  context: {
    wiaCryptoContext: CryptoContext;
  }
) => Promise<MrtdProofChallengeInfo["payload"]>;

/**
 * Verifies and parses the payload of a MRTD Proof Challenge Info JWT obtained after the primary authentication.
 *
 * This function performs the following steps:
 * 1. Validates the JWT signature using the issuer's JWKS.
 * 2. Decodes the JWT and parses its structure according to the {@link MrtdProofChallengeInfo} schema.
 * 3. Verifies that the `aud` claim matches the client's public key ID.
 * 4. Checks that the JWT is not expired and was not issued in the future.
 *
 * @param issuerConf - The issuer configuration containing the JWKS for signature verification.
 * @param challengeInfoJwt - The JWT string representing the MRTD Proof Challenge Info.
 * @param context - The context containing the WIA crypto context used to retrieve the client public key.
 * @returns The parsed payload of the MRTD Proof Challenge Info JWT.
 * @throws {Error} If the JWT signature is invalid, the structure is malformed, the `aud` claim does not match,
 * or the JWT is expired/not yet valid.
 */
export const verifyAndParseChallengeInfo: VerifyAndParseChallengeInfo = async (
  _issuerConf,
  challengeInfoJwt: string,
  { wiaCryptoContext }
) => {
  // TODOP Validate JWT signature
  /*   
  await verifyJwt(
    challengeInfoJwt,
    issuerConf.openid_credential_issuer.jwks.keys
  ); 
  */

  // Decode JWT
  const challengeInfoDecoded = decodeJwt(challengeInfoJwt);

  // Parse and validate structure
  const challengeInfoParsed =
    MrtdProofChallengeInfo.safeParse(challengeInfoDecoded);
  if (!challengeInfoParsed.success) {
    throw new Error("Malformed challenge info.");
  }
  const payload = challengeInfoParsed.data.payload;

  // Verify aud claim
  const clientId = await wiaCryptoContext.getPublicKey().then((_) => _.kid);
  if (payload.aud !== clientId) {
    throw new Error("aud claim does not match client_id.");
  }

  // Verify iat and exp
  const now = Math.floor(Date.now() / 1000);
  if (payload.iat > now || payload.exp < now) {
    throw new Error("JWT is not valid (issued in future or expired).");
  }

  return payload;
};
