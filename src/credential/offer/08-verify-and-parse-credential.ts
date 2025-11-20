import { type CryptoContext } from "@pagopa/io-react-native-jwt";
import { type Out } from "../../utils/misc";
import { IoWalletError } from "../../utils/errors";
import { isSameThumbprint } from "../../utils/jwk";
import {
  getMdocNamespaceForCredentialId,
  getParsedCredentialClaimKey,
  verify as verifyMdoc,
} from "../../mdoc";
import { Logger, LogLevel } from "../../utils/logging";
import { extractElementValueAsDate } from "../../mdoc/converter";
import type { CBOR } from "@pagopa/io-react-native-iso18013";
import type {
  PublicKey,
  X509CertificateOptions,
} from "@pagopa/io-react-native-crypto";
import type { EvaluateIssuerMetadataFromOffer } from "./03-evaluate-issuer-metadata";
import type { ObtainCredential } from "./07-obtain-credential";
import { SDJwtInstance } from "@sd-jwt/core";
import { digest } from "@sd-jwt/crypto-nodejs";
import type { ClaimDef, CredentialDisplay } from "./types";

const NON_DISCLOSABLE_CLAIMS = [
  "status",
  "cnf",
  "iat",
  "iss",
  "vct",
  "exp",
  "_sd_alg",
];

type IssuerConf = Out<EvaluateIssuerMetadataFromOffer>["issuerConf"];

type CredentialConf = IssuerConf["credential_configurations_supported"][string];

type DecodedMDocCredential = Out<typeof verifyMdoc> & {
  issuerSigned: CBOR.IssuerSigned;
};

export type VerifyAndParseCredential = (
  issuerConf: IssuerConf,
  credential: Out<ObtainCredential>["credential"],
  credentialConfigurationId: string,
  context: {
    credentialCryptoContext: CryptoContext;
    ignoreMissingAttributes?: boolean;
    includeUndefinedAttributes?: boolean;
  },
  x509CertRoot?: string,
  x509CertVerificationOptions?: X509CertificateOptions
) => Promise<{
  parsedCredential: ParsedCredential;
  expiration: Date;
  issuedAt: Date | undefined;
}>;

type ParsedCredential = {
  [claim: string]: {
    name: Record<string /* locale */, string /* value */> | string | undefined;
    value: unknown;
  };
};

export const parseCredentialSdJwt = (
  credentialConfig: CredentialConf,
  parsedCredentialRaw: Record<string, unknown>
): ParsedCredential => {
  // Validate credential configuration
  if (!credentialConfig.credential_metadata) {
    Logger.log(LogLevel.ERROR, "Missing credential metadata");
    throw new IoWalletError("Missing credential metadata");
  }

  // Validate claims
  if (!credentialConfig.credential_metadata.claims) {
    Logger.log(LogLevel.ERROR, "Missing claims in the credential subject");
    throw new IoWalletError("Missing claims in the credential subject");
  }

  // Validate VCT
  if (
    typeof parsedCredentialRaw.vct === "string" &&
    typeof credentialConfig.vct === "string" &&
    credentialConfig.vct !== parsedCredentialRaw.vct
  ) {
    Logger.log(LogLevel.ERROR, "VCT mismatch in the credential");
    throw new IoWalletError("VCT mismatch in the credential");
  }

  const metadataMap = new Map<string, CredentialDisplay[]>();
  const claimsMetadata = credentialConfig.credential_metadata?.claims;

  if (claimsMetadata && Array.isArray(claimsMetadata)) {
    claimsMetadata.forEach((claim: ClaimDef) => {
      if (claim.path.length > 0) {
        const pathKey = claim.path.join(".");
        metadataMap.set(pathKey, claim.display);
      }
    });
  }

  const processObject = (
    obj: Record<string, unknown>,
    parentPath: string[] = []
  ): ParsedCredential => {
    const result: ParsedCredential = {};

    for (const [key, value] of Object.entries(obj)) {
      if (NON_DISCLOSABLE_CLAIMS.includes(key)) {
        continue;
      }

      const currentPathArray = [...parentPath, key];
      const currentPathString = currentPathArray.join(".");

      let localizedNames: Record<string, string> | string | undefined;
      const displayDefinition = metadataMap.get(currentPathString);

      if (displayDefinition) {
        localizedNames = {};
        for (const entry of displayDefinition) {
          localizedNames[entry.locale] = entry.name;
        }
      } else {
        localizedNames = key;
      }

      let processedValue: unknown = value;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        processedValue = processObject(
          value as Record<string, unknown>,
          currentPathArray
        );
      } else {
        processedValue = value;
      }

      result[key] = {
        name: localizedNames,
        value: processedValue,
      };
    }

    return result;
  };

  return processObject(parsedCredentialRaw);
};

const parseCredentialMDoc = (
  credentialConfig: CredentialConf,
  { issuerSigned }: DecodedMDocCredential,
  ignoreMissingAttributes: boolean = false,
  includeUndefinedAttributes: boolean = false
): ParsedCredential => {
  if (!credentialConfig) {
    throw new IoWalletError("Credential type not supported by the issuer");
  }

  if (!credentialConfig.credential_metadata?.claims) {
    throw new IoWalletError("Missing claims in the credential subject");
  }

  const attrDefinitions = credentialConfig.credential_metadata.claims.map<
    [string, string, { name: string; locale: string }[]]
  >(({ path: [namespace, attribute], display }) => [
    namespace as string,
    attribute as string,
    display,
  ]);

  if (!issuerSigned.nameSpaces) {
    throw new IoWalletError("Missing claims in the credential");
  }

  const flatNamespaces = Object.entries(issuerSigned.nameSpaces).flatMap(
    ([namespace, values]) =>
      values.map<[string, string, string]>((v) => [
        namespace,
        v.elementIdentifier,
        v.elementValue,
      ])
  );

  const attrsNotInDisclosures = attrDefinitions.filter(
    ([attrDefNamespace, attrKey]) =>
      !flatNamespaces.some(
        ([namespace, claim]) =>
          attrDefNamespace === namespace && attrKey === claim
      )
  );

  if (attrsNotInDisclosures.length > 0) {
    const missing = attrsNotInDisclosures
      .map(([, attrKey]) => attrKey)
      .join(", ");
    const received = flatNamespaces.map(([, attrKey]) => attrKey).join(", ");

    if (!ignoreMissingAttributes) {
      throw new IoWalletError(
        `Some attributes are missing in the credential. Missing: [${missing}], received: [${received}]`
      );
    }
  }

  const definedValues = attrDefinitions
    .map(
      ([attrDefNamespace, attrKey, display]) =>
        [
          attrDefNamespace,
          attrKey,
          {
            display,
            value: flatNamespaces.find(
              ([namespace, name]) =>
                attrDefNamespace === namespace && name === attrKey
            )?.[2],
          },
        ] as const
    )
    .filter(([_, __, definition]) => definition.value !== undefined)
    .reduce<ParsedCredential>(
      (acc, [attrDefNamespace, attrKey, { display, value }]) => ({
        ...acc,
        [getParsedCredentialClaimKey(attrDefNamespace, attrKey)]: {
          value,
          name: display.reduce(
            (names, { locale, name }) => ({
              ...names,
              [locale]: name,
            }),
            {}
          ),
        },
      }),
      {}
    );

  if (includeUndefinedAttributes) {
    const undefinedValues: ParsedCredential = Object.fromEntries(
      Object.values(flatNamespaces)
        .filter(
          ([namespace, key]) =>
            !definedValues[getParsedCredentialClaimKey(namespace, key)]
        )
        .map(([namespace, key, value]) => [
          getParsedCredentialClaimKey(namespace, key),
          { value, name: key },
        ])
    );
    return {
      ...definedValues,
      ...undefinedValues,
    };
  }

  return definedValues;
};

async function verifyCredentialMDoc(
  rawCredential: string,
  x509CertRoot: string,
  holderBindingContext: CryptoContext,
  x509CertVerificationOptions?: X509CertificateOptions
): Promise<DecodedMDocCredential> {
  const [decodedCredential, holderBindingKey] = await Promise.all([
    verifyMdoc(rawCredential, x509CertRoot, x509CertVerificationOptions),
    holderBindingContext.getPublicKey(),
  ]);

  if (!decodedCredential) {
    throw new IoWalletError("No MDOC credentials found!");
  }

  const key =
    decodedCredential.issuerSigned.issuerAuth.payload.deviceKeyInfo.deviceKey;

  if (!(await isSameThumbprint(key, holderBindingKey as PublicKey))) {
    throw new IoWalletError(
      `Failed to verify holder binding, holder binding key and mDoc deviceKey don't match`
    );
  }

  return decodedCredential;
}

const verifyAndParseCredentialSdJwt: VerifyAndParseCredential = async (
  issuerConf,
  credential,
  credentialConfigurationId,
  _context,
  _x509CertRoot,
  _x509CertVerificationOptions
) => {
  // Create SD-JWT instance with the appropriate hasher
  const sdJwtInstance = new SDJwtInstance({
    hasher: digest,
  });

  // Decode and obtain the SD-JWT credential claims
  const claims = (await sdJwtInstance.getClaims(credential)) as Record<
    string,
    unknown
  >;

  // TODO: verify signature with issuer's public keys
  // TODO: parse claims schema

  Logger.log(LogLevel.DEBUG, `Decoded claims: ${JSON.stringify(claims)}`);

  const credentialConfig =
    issuerConf.credential_configurations_supported[credentialConfigurationId];

  if (!credentialConfig) {
    Logger.log(
      LogLevel.ERROR,
      `Credential type not supported by the issuer: ${credentialConfigurationId}`
    );
    throw new IoWalletError("Credential type not supported by the issuer");
  }

  const parsedCredential = parseCredentialSdJwt(credentialConfig, claims);

  Logger.log(
    LogLevel.DEBUG,
    `Parsed credential: ${JSON.stringify(parsedCredential)}`
  );

  if (typeof claims.exp !== "number") {
    throw new IoWalletError("Invalid or missing expiration claim (exp)");
  }
  const expiration = new Date(claims.exp * 1000);

  return {
    parsedCredential,
    expiration,
    issuedAt:
      typeof claims.iat === "number" ? new Date(claims.iat * 1000) : undefined,
  };
};

const verifyAndParseCredentialMDoc: VerifyAndParseCredential = async (
  issuerConf,
  credential,
  credentialConfigurationId,
  { credentialCryptoContext, ignoreMissingAttributes },
  x509CertRoot,
  x509CertVerificationOptions
) => {
  if (!x509CertRoot) {
    throw new IoWalletError("Missing x509CertRoot");
  }

  const decoded = await verifyCredentialMDoc(
    credential,
    x509CertRoot,
    credentialCryptoContext,
    x509CertVerificationOptions
  );

  const credentialConfig =
    issuerConf.credential_configurations_supported[credentialConfigurationId]!;

  const parsedCredential = parseCredentialMDoc(
    credentialConfig,
    decoded,
    ignoreMissingAttributes,
    ignoreMissingAttributes
  );

  const ns = getMdocNamespaceForCredentialId(credentialConfigurationId);
  if (!ns) {
    throw new IoWalletError(
      `Cannot find namespace for credentialConfigurationId: ${credentialConfigurationId}`
    );
  }

  const expirationDate = extractElementValueAsDate(
    parsedCredential?.[getParsedCredentialClaimKey(ns, "expiry_date")]
      ?.value as string
  );
  if (!expirationDate) {
    throw new IoWalletError(`expirationDate must be present!!`);
  }
  expirationDate.setDate(expirationDate.getDate() + 1);

  const maybeIssuedAt = extractElementValueAsDate(
    parsedCredential?.[getParsedCredentialClaimKey(ns, "issue_date")]
      ?.value as string
  );
  maybeIssuedAt?.setDate(maybeIssuedAt.getDate() + 1);

  return {
    parsedCredential,
    credential,
    credentialConfigurationId,
    expiration: expirationDate,
    issuedAt: maybeIssuedAt ?? undefined,
  };
};

export const verifyAndParseCredential: VerifyAndParseCredential = async (
  issuerConf,
  credential,
  credentialConfigurationId,
  context,
  x509CertRoot,
  x509CertVerificationOptions
) => {
  const format =
    issuerConf.credential_configurations_supported[credentialConfigurationId]
      ?.format;

  switch (format) {
    case "dc+sd-jwt": {
      Logger.log(LogLevel.DEBUG, "Parsing credential in dc+sd-jwt format");
      return verifyAndParseCredentialSdJwt(
        issuerConf,
        credential,
        credentialConfigurationId,
        context
      );
    }
    case "mso_mdoc": {
      Logger.log(LogLevel.DEBUG, "Parsing credential in mso_mdoc format");
      return verifyAndParseCredentialMDoc(
        issuerConf,
        credential,
        credentialConfigurationId,
        context,
        x509CertRoot,
        x509CertVerificationOptions
      );
    }

    default: {
      const message = `Unsupported credential format: ${format}`;
      Logger.log(LogLevel.ERROR, message);
      throw new IoWalletError(message);
    }
  }
};
