import type {
  GetX509CertificateMetadataCallback,
  VerifyX509CertificateChainCallback,
  X509CertificateMetadata,
} from "@pagopa/io-wallet-eudi-trust";

import { X509, zulutodate } from "jsrsasign";

import { partialCallbacks } from "../../utils/callbacks";
import {
  convertBase64DerToPem,
  getSigninJwkFromCert,
} from "../../utils/crypto";
import { Logger, LogLevel } from "../../utils/logging";
import { verifyX509Chain } from "../../utils/x509";

const ORGANIZATION_IDENTIFIER_OID = "2.5.4.97";

type DistinguishedName = Record<string, string>;

const parseDistinguishedName = (dn: string): DistinguishedName =>
  Object.fromEntries(
    dn
      .split("/")
      .filter(Boolean)
      .map((rdn) => {
        const separator = rdn.indexOf("=");
        return [rdn.slice(0, separator), rdn.slice(separator + 1)];
      }),
  );

const getOrganizationIdentifier = (dn: DistinguishedName) =>
  dn.organizationIdentifier ?? dn[ORGANIZATION_IDENTIFIER_OID];

export const getX509CertificateMetadata: GetX509CertificateMetadataCallback = (
  certificate,
) => {
  const x509 = new X509();
  x509.readCertPEM(convertBase64DerToPem(certificate));

  const subject = parseDistinguishedName(x509.getSubjectString());
  const issuer = parseDistinguishedName(x509.getIssuerString());
  const keyUsage = x509.getExtKeyUsageString();
  const san = x509.getExtSubjectAltName2() as [string, string][] | undefined;
  const policies = x509.getExtCertificatePolicies()?.array as
    | undefined
    | { array?: { cps?: string }[]; policyoid: string }[];

  return {
    country: subject.C,
    isCA: x509.getExtBasicConstraints()?.cA === true,
    issuerOrganizationIdentifier: getOrganizationIdentifier(issuer),
    keyUsage: keyUsage ? keyUsage.split(",") : undefined,
    notAfter: zulutodate(x509.getNotAfter()),
    notBefore: zulutodate(x509.getNotBefore()),
    organizations: subject.O ? [subject.O] : [],
    policies: policies?.map(({ array, policyoid }) => ({
      cpsUris: (array ?? []).flatMap(({ cps }) => (cps ? [cps] : [])),
      oid: policyoid,
    })),
    publicJwk: getSigninJwkFromCert(
      convertBase64DerToPem(certificate),
    ) as X509CertificateMetadata["publicJwk"],
    subject: {
      commonName: subject.CN,
      countryName: subject.C,
      givenName: subject.GN,
      organizationIdentifier: getOrganizationIdentifier(subject),
      organizationName: subject.O,
      serialNumber: subject.serialNumber,
      surname: subject.SN,
    },
    subjectAltNames: {
      emails: (san ?? []).filter(([t]) => t === "RFC822").map(([, v]) => v),
      phoneNumbers: [],
      uris: (san ?? []).filter(([t]) => t === "URI").map(([, v]) => v),
    },
  };
};

/**
 * Validates the chain with the native validator.
 * The validation time is the current one, and revocation is not checked yet.
 */
export const verifyX509CertificateChain: VerifyX509CertificateChainCallback =
  async ({ chain, trustAnchor }) => {
    try {
      await verifyX509Chain(chain, trustAnchor, {
        connectTimeout: 10_000,
        readTimeout: 10_000,
        requireCrl: false,
      });
      return true;
    } catch (error) {
      Logger.log(LogLevel.DEBUG, `Trust Anchor candidate rejected: ${error}`);
      return false;
    }
  };

// TODO: use proper type exported from @pagopa/io-wallet-eudi-trust
export const trustCallbacks = {
  getX509CertificateMetadata,
  hash: partialCallbacks.hash,
  verifyJwt: partialCallbacks.verifyJwt,
  verifyX509CertificateChain,
};
