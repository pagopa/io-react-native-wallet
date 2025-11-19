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
import { type SdJwtDecoded, SdJwtDecodedSchema } from "./types";
import {
  buildName,
  resolveNestedDisclosureValue,
} from "../../utils/parserUtils";

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
  // The credential configuration to use to parse the provided credential
  credentialConfig: CredentialConf,
  { jwt, disclosures }: SdJwtDecoded,
  ignoreMissingAttributes: boolean = false,
  includeUndefinedAttributes: boolean = false
): ParsedCredential => {
  if (credentialConfig.format !== jwt.header.typ) {
    const message = `Received credential is of an unknown type. Expected one of [${credentialConfig.format}], received '${jwt.header.typ}'`;
    Logger.log(LogLevel.ERROR, message);
    throw new IoWalletError(message);
  }

  if (!credentialConfig.credential_metadata) {
    Logger.log(LogLevel.ERROR, "Missing credential metadata");
    throw new IoWalletError("Missing credential metadata");
  }

  if (!credentialConfig.credential_metadata.claims) {
    Logger.log(LogLevel.ERROR, "Missing claims in the credential subject");
    throw new IoWalletError("Missing claims in the credential subject");
  }

  const attrDefinitions = credentialConfig.credential_metadata.claims;

  if (!ignoreMissingAttributes) {
    const disclosedKeys = new Set(disclosures.map(({ key }) => key));
    const payloadKeys = new Set(Object.keys(jwt.payload ?? {}));

    const definedTopLevelKeys = new Set(
      attrDefinitions.map((def) => def.path[0] as string)
    );

    const missingKeys = [...definedTopLevelKeys].filter(
      (key) => !disclosedKeys.has(key) && !payloadKeys.has(key)
    );

    if (missingKeys.length > 0) {
      throw new IoWalletError(
        `Some attributes are missing in the credential. Missing: [${missingKeys.join(", ")}]`
      );
    }
  }

  const definedValues: ParsedCredential = {};

  const groupedDefinitions = attrDefinitions.reduce(
    (acc, def) => {
      const key = def.path[0] as string;
      const group = acc[key];

      if (def.path.length === 1) {
        acc[key] = {
          definition: def,
          nested: group?.nested || [],
        };
      } else {
        const parentKey = def.path[0] as string;
        acc[parentKey] = acc[parentKey] || {
          definition: undefined,
          nested: [],
        };
        acc[parentKey]!.nested.push(def);
      }
      return acc;
    },
    {} as Record<string, { definition?: any; nested: any[] }>
  );

  for (const topLevelKey in groupedDefinitions) {
    const obj = groupedDefinitions[topLevelKey];

    if (!obj) {
      throw new IoWalletError(`Unknown type "${topLevelKey}"`);
    }
    const { definition: topLevelDef, nested: nestedDefs } = obj;

    const disclosureForThisKey = disclosures.find(
      ({ key }) => key === topLevelKey
    );

    if (!disclosureForThisKey) {
      continue;
    }

    const resolvedValue = resolveNestedDisclosureValue(
      disclosures,
      disclosureForThisKey.value
    );

    if (
      Object.keys(resolvedValue).length > 0 &&
      (nestedDefs.length > 0 || typeof resolvedValue === "object")
    ) {
      if (nestedDefs.length > 0) {
        const mappedNestedValue: Record<string, unknown> = {};

        for (const nestedDef of nestedDefs) {
          const nestedKey = nestedDef.path[1] as string;

          if (Object.prototype.hasOwnProperty.call(resolvedValue, nestedKey)) {
            mappedNestedValue[nestedKey] = {
              value: (resolvedValue as any)[nestedKey],
              name: buildName(nestedDef.display),
            };
          }
        }

        definedValues[topLevelKey] = {
          value: mappedNestedValue,
          name: buildName(topLevelDef.display),
        };
      } else {
        definedValues[topLevelKey] = {
          value: resolvedValue,
          name: buildName(topLevelDef.display),
        };
      }
    } else if (resolvedValue !== undefined) {
      definedValues[topLevelKey] = {
        value: resolvedValue,
        name: buildName(obj.definition.display),
      };
    }
  }

  if (includeUndefinedAttributes) {
    const undefinedValues = Object.fromEntries(
      disclosures
        .filter((_) => !Object.keys(definedValues).includes(_.salt))
        .map(({ key, value }) => [key, { value, name: key }])
    );

    return {
      ...definedValues,
      ...undefinedValues,
    };
  }

  return definedValues;
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
  { ignoreMissingAttributes }
) => {
  // Create SD-JWT instance with the appropriate hasher
  const sdJwt = new SDJwtInstance({
    hasher: digest,
  });

  // Decode and verify the SD-JWT credential
  const decodedRawSdJwt = await sdJwt.decode(credential);

  // Parse and validate the decoded SD-JWT structure
  const decodedSdJwt = SdJwtDecodedSchema.parse(decodedRawSdJwt);

  //TODO: verify signature with issuer's public keys

  Logger.log(
    LogLevel.DEBUG,
    `Decoded credential: ${JSON.stringify(decodedSdJwt)}`
  );

  const credentialConfig =
    issuerConf.credential_configurations_supported[credentialConfigurationId];

  if (!credentialConfig) {
    Logger.log(
      LogLevel.ERROR,
      `Credential type not supported by the issuer: ${credentialConfigurationId}`
    );
    throw new IoWalletError("Credential type not supported by the issuer");
  }

  const parsedCredential = parseCredentialSdJwt(
    credentialConfig,
    decodedSdJwt,
    ignoreMissingAttributes
  );
  const maybeIssuedAt = decodedSdJwt.jwt.payload.iat;

  Logger.log(
    LogLevel.DEBUG,
    `Parsed credential: ${JSON.stringify(parsedCredential)}`
  );

  Logger.log(
    LogLevel.DEBUG,
    `Credential expiration (exp): ${new Date(decodedSdJwt.jwt.payload.exp * 1000)}`
  );

  Logger.log(
    LogLevel.DEBUG,
    `Credential issued at (iat): ${
      typeof maybeIssuedAt === "number"
        ? new Date(maybeIssuedAt * 1000)
        : "undefined"
    }`
  );

  return {
    parsedCredential,
    expiration: new Date(decodedSdJwt.jwt.payload.exp * 1000),
    issuedAt:
      typeof maybeIssuedAt === "number"
        ? new Date(maybeIssuedAt * 1000)
        : undefined,
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
