import { CBOR } from "@pagopa/io-react-native-iso18013";
import { decode, verify } from "@pagopa/io-react-native-jwt";
import {
  LoTEProfile,
  validateCertificateChainAgainstLoTE,
} from "@pagopa/io-wallet-eudi-trust";
import { b64utob64 } from "jsrsasign";

import { verifyMdocSignature } from "../../../mdoc";
import { MissingX509CertsError } from "../../../trust/common/errors";
import { getJwkFromCertificateChain } from "../../../utils/crypto";
import { IoWalletError, ValidationFailed } from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import { LoTEs } from "../../trust";
import { trustCallbacks } from "../../trust/callbacks";
import { EUDI_MDL_DOCTYPE, EUDI_PID_DOCTYPE, EUDI_PID_VCT } from "../const";

type VerifyCredential = (params: {
  credential: string;
  format: string;
  lotes: LoTEs;
}) => Promise<{
  trustAnchor: string;
}>;

/**
 * Verifies the issuer signature of a credential and the trust of its certificate chain against the provided LoTEs.
 *
 * @param params.format - The credential format, `dc+sd-jwt`, `vc+sd-jwt` or `mso_mdoc`
 * @param params.credential - The issued credential
 * @param params.lotes - The List of Trusted Entities to validate the certificate chain against
 * @returns The LoTE validated trust anchor that verified the signature
 * @throws {IoWalletError} If the format is not supported or no matching LoTE is found
 */
export const verifyCredential: VerifyCredential = async ({
  credential,
  format,
  lotes,
}) => {
  switch (format) {
    case "dc+sd-jwt":
    case "vc+sd-jwt":
      return verifyCredentialSdJwt(credential, lotes);
    case "mso_mdoc":
      return verifyCredentialMdoc(credential, lotes);
    default:
      throw new IoWalletError(`Unsupported credential format: ${format}`);
  }
};

const verifyCredentialSdJwt = async (sdJwt: string, lotes: LoTEs) => {
  // To verify SD-JWT credentials, remove disclosures first
  const [signedJwt] = sdJwt.split("~");
  const { payload, protectedHeader } = decode(signedJwt);

  if (!protectedHeader.x5c) {
    throw new ValidationFailed({
      message: "JWT header is missing x5c with signing certificate",
    });
  }

  const { profile, serviceTypeIdentifier } = getCandidateLoTEIssuanceProfile(
    payload.vct as string,
  );
  const lote = lotes[profile];

  Logger.log(
    LogLevel.DEBUG,
    `Verifying credential ${payload.vct} with LoTE profile ${profile} and service type identifier ${serviceTypeIdentifier}`,
  );

  if (!lote) {
    throw new IoWalletError(`No LoTE found that matches profile ${profile}`);
  }

  const trustAnchor = await validateCertificateChainAgainstLoTE({
    callbacks: trustCallbacks,
    chain: protectedHeader.x5c as [string, ...string[]],
    lote,
    profile,
    serviceTypeIdentifier,
  });

  // The chain has been validated, we can safely extract the public key from the signing certificate
  const signingJwk = await getJwkFromCertificateChain(protectedHeader.x5c);

  Logger.log(
    LogLevel.DEBUG,
    `Extracted Trust Anchor from LoTE ${lote.document.ListAndSchemeInformation.LoTEType}:\n${trustAnchor}`,
  );
  Logger.log(
    LogLevel.DEBUG,
    `Trusted signing certificate:\n${protectedHeader.x5c[0]}`,
  );

  await verify(signedJwt, signingJwk);

  return { trustAnchor };
};

const verifyCredentialMdoc = async (mdoc: string, lotes: LoTEs) => {
  const { issuerAuth } = await CBOR.decodeIssuerSigned(mdoc);

  const x5chain = issuerAuth.unprotectedHeader?.x5chain?.map(b64utob64);
  if (!Array.isArray(x5chain) || x5chain.length === 0) {
    throw new MissingX509CertsError("Missing x509 certificates");
  }

  const { docType } = issuerAuth.payload;
  if (!docType) {
    throw new ValidationFailed({ message: "mDoc is missing the docType" });
  }

  const { profile, serviceTypeIdentifier } =
    getCandidateLoTEIssuanceProfile(docType);
  const lote = lotes[profile];

  Logger.log(
    LogLevel.DEBUG,
    `Verifying credential ${docType} with LoTE profile ${profile} and service type identifier ${serviceTypeIdentifier}`,
  );

  if (!lote) {
    throw new IoWalletError(`No LoTE found that matches profile ${profile}`);
  }

  const trustAnchor = await validateCertificateChainAgainstLoTE({
    callbacks: trustCallbacks,
    chain: x5chain as [string, ...string[]],
    lote,
    profile,
    serviceTypeIdentifier,
  });

  if (!issuerAuth.rawValue) {
    throw new IoWalletError("Missing coseSign1");
  }

  Logger.log(
    LogLevel.DEBUG,
    `Extracted Trust Anchor from LoTE ${lote.document.ListAndSchemeInformation.LoTEType}:\n${trustAnchor}`,
  );
  Logger.log(LogLevel.DEBUG, `Trusted signing certificate:\n${x5chain[0]}`);

  // The chain has been validated, we can safely verify the signature with the leaf certificate
  await verifyMdocSignature(issuerAuth.rawValue, x5chain[0]);

  return { trustAnchor };
};

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
    };
  }

  if (credentialType === EUDI_MDL_DOCTYPE) {
    return {
      profile: LoTEProfile.mDLProvidersList,
      serviceTypeIdentifier:
        "http://trust.ec.europa.eu/lists/mDL/SvcType/Issuance",
    };
  }

  return {
    profile: LoTEProfile.EUEAAProvidersList,
    serviceTypeIdentifier: "???",
  };
};
