import { decode, verify } from "@pagopa/io-react-native-jwt"
import { IoWalletError, ValidationFailed } from "../../../utils/errors";
import { JWTDecodeResult } from "../../../utils/jwk";
import { LoTEs } from "../../trust";
import { getJwkFromCertificateChain } from "../../../utils/crypto";
import { LoTEProfile, validateLoTECertificateChain } from "@pagopa/io-wallet-eudi-trust";
import { trustCallbacks } from "../../trust/callbacks";
import { EUDI_MDL_DOCTYPE, EUDI_PID_DOCTYPE, EUDI_PID_VCT } from "../const";
import { Logger, LogLevel } from "../../../utils/logging";

type VerifyJwtWithLoTE = (params: {
  jwt: { compact: string; decoded?: JWTDecodeResult };
  lotes: LoTEs;
}) => Promise<{
  header: JWTDecodeResult["protectedHeader"];
  payload: JWTDecodeResult["payload"];
}>;

export const verifyJwtWithLoTE: VerifyJwtWithLoTE = async ({
  jwt,
  lotes,
}) => {
  const [compactJwt] = jwt.compact.split("~") // TODO: use proper SD-JWT utils
  const { payload, protectedHeader } = jwt.decoded ?? decode(compactJwt);

  if (!protectedHeader.x5c) {
    throw new ValidationFailed({
      message: "JWT header is missing x5c with signing certificate",
    });
  }

  const { profile, serviceTypeIdentifier } = getCandidateLoTEIssuanceProfile(payload.vct as string)
  const lote = lotes[profile]

  Logger.log(LogLevel.DEBUG,
    `Verifying credential ${payload.vct} with LoTE profile ${profile} and service type identifier ${serviceTypeIdentifier}`)

  if (!lote) {
    throw new IoWalletError(`No LoTE found that matches profile ${profile}`)
  }

  await validateLoTECertificateChain({
    callbacks: trustCallbacks,
    chain: protectedHeader.x5c as [string, ...string[]],
    profile,
    lote,
    serviceTypeIdentifier,
  })

  // The chain has been validated, we can safely extract the public key from the signing certificate
  const signingJwk = await getJwkFromCertificateChain(protectedHeader.x5c)
  await verify(compactJwt, signingJwk);

  return { header: protectedHeader, payload }
}

/**
 * Return the most relevant LoTE profile and service type identifier for issuance, based on the provided credential type.
 *
 * TODO: the function is incomplete: service type identifiers are missing, how to determine whether a credential is PubEAA vs EAA?
 */
export const getCandidateLoTEIssuanceProfile = (credentialType: string) => {
  if (credentialType === EUDI_PID_VCT || credentialType === EUDI_PID_DOCTYPE) {
    return {
      profile: LoTEProfile.EUPIDProvidersList,
      serviceTypeIdentifier: "http://uri.etsi.org/19602/SvcType/PID/Issuance",
    }
  }

  if (credentialType === EUDI_MDL_DOCTYPE) {
    return {
      profile: LoTEProfile.mDLProvidersList,
      serviceTypeIdentifier: "???"
    }
  }

  return {
    profile: LoTEProfile.EUPubEAAProvidersList,
    serviceTypeIdentifier: "???"
  }
}
