import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import { IoWalletError } from "../../utils/errors";
import { SdJwt4VC, verifyEudiwCredential } from "../../sd-jwt";
import { getValueFromDisclosures } from "../../sd-jwt/converters";
import { isSameThumbprint, type JWK } from "../../utils/jwk";
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
import { createNestedProperty } from "../../utils/nestedProperty";
import type { EvaluateIssuerMetadataFromOffer } from "./03-evaluate-issuer-metadata";
import type { ObtainCredential } from "./07-obtain-credential";
import type { Disclosure } from "../../sd-jwt/types";

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
    jwksUri: string;
    appFetch?: GlobalFetch["fetch"];
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

type DecodedSdJwtCredential = {
  sdJwt: SdJwt4VC;
  disclosures: Disclosure[];
};

const parseCredentialSdJwt = (
  credentialConfig: CredentialConf,
  { sdJwt, disclosures }: DecodedSdJwtCredential,
  ignoreMissingAttributes: boolean = false,
  includeUndefinedAttributes: boolean = false
): ParsedCredential => {
  if (credentialConfig.format !== sdJwt.header.typ) {
    const message = `Received credential is of an unknown type. Expected one of [${credentialConfig.format}], received '${sdJwt.header.typ}'`;
    Logger.log(LogLevel.ERROR, message);
    throw new IoWalletError(message);
  }

  if (!credentialConfig.credential_metadata?.claims) {
    Logger.log(LogLevel.ERROR, "Missing claims in the credential subject");
    throw new IoWalletError("Missing claims in the credential subject");
  }

  const attrDefinitions = credentialConfig.credential_metadata.claims;

  if (!ignoreMissingAttributes) {
    const disclosedKeys = new Set(disclosures.map(([, name]) => name));
    const payloadKeys = new Set(Object.keys(sdJwt.payload ?? {}));

    const definedTopLevelKeys = new Set(
      attrDefinitions.map((def) => def.path[0] as string)
    );

    const missingKeys = [...definedTopLevelKeys].filter(
      (key) => !disclosedKeys.has(key) && !payloadKeys.has(key)
    );

    if (missingKeys.length > 0) {
      throw new IoWalletError(
        `Some attributes are missing in the credential. Missing: [${missingKeys.join(
          ", "
        )}]`
      );
    }
  }

  const definedValues: ParsedCredential = {};

  const groupedDefinitions = attrDefinitions.reduce(
    (acc, def) => {
      const key = def.path[0] as string;
      const group = acc[key];
      if (group) {
        group.push(def);
      } else {
        acc[key] = [def];
      }
      return acc;
    },
    {} as Record<string, typeof attrDefinitions>
  );

  for (const topLevelKey in groupedDefinitions) {
    const definitionsForThisKey = groupedDefinitions[topLevelKey];

    if (!definitionsForThisKey) {
      continue;
    }

    const disclosureForThisKey = disclosures.find(
      ([, name]) => name === topLevelKey
    );

    if (!disclosureForThisKey) {
      continue;
    }

    const disclosureValue = disclosureForThisKey[2];

    const tempObjectForGroup = definitionsForThisKey.reduce(
      (acc, { path, display }) =>
        createNestedProperty(acc, path, disclosureValue, display),
      {}
    );

    Object.assign(definedValues, tempObjectForGroup);
  }

  if (includeUndefinedAttributes) {
    const undefinedValues = Object.fromEntries(
      disclosures
        .filter((_) => {
          const key = _.length === 3 ? _[1] : undefined;
          return key && !Object.keys(definedValues).includes(key);
        })
        .map((_) => {
          if (_.length === 3) {
            const [, key, value] = _;
            return [key, { value, name: key }];
          } else {
            const [, value] = _;
            return [String(value), { value, name: String(value) }];
          }
        })
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

async function verifyCredentialSdJwt(
  rawCredential: string
): Promise<DecodedSdJwtCredential> {
  const [decodedCredential] = await Promise.all([
    verifyEudiwCredential(rawCredential),
  ]);

  return decodedCredential;
}

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
  {
    jwksUri,
    appFetch = fetch,
    ignoreMissingAttributes,
    includeUndefinedAttributes,
  }
) => {
  Logger.log(LogLevel.INFO, `Fetching JWKS from: ${jwksUri}`);
  const jwks = await appFetch(jwksUri, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((data) => data.keys as JWK[])
    .catch((err) => {
      Logger.log(
        LogLevel.ERROR,
        `Failed to fetch JWKS from ${jwksUri}: ${err}`
      );
      throw new IoWalletError(`Failed to fetch JWKS: ${err.message}`);
    });

  if (!jwks || jwks.length === 0) {
    throw new Error("Failed to fetch JWKS or key list is empty");
  }
  if (!jwks || jwks.length === 0) {
    throw new Error("Failed to fetch JWKS or key list is empty");
  }

  console.log("JWKS fetched:", jwks);

  const decoded = await verifyCredentialSdJwt(credential);

  Logger.log(LogLevel.DEBUG, `Decoded credential: ${JSON.stringify(decoded)}`);

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
    decoded,
    ignoreMissingAttributes,
    includeUndefinedAttributes
  );
  const maybeIssuedAt = getValueFromDisclosures(decoded.disclosures, "iat");

  Logger.log(
    LogLevel.DEBUG,
    `Parsed credential: ${JSON.stringify(
      parsedCredential
    )}\nIssued at: ${maybeIssuedAt}`
  );

  return {
    parsedCredential,
    expiration: new Date(decoded.sdJwt.payload.exp * 1000),
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
  // appFetch e jwksUri sono qui solo per conformità al tipo
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
  console.log("PARSED CRED", parsedCredential);

  console.log(
    "PARSED exp date",
    getParsedCredentialClaimKey(ns, "expiry_date")
  );
  console.log(
    "PARSED 2 exp date",
    parsedCredential?.[getParsedCredentialClaimKey(ns, "expiry_date")]
  );
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
