import { z } from 'zod';
import { coerceToJSON } from './schema.utils';

export enum DocumentTypeEnum {
  MDL = 'org.iso.18013.5.1.mDL',
  EU_PID = 'eu.europa.ec.eudi.pid.1',
}

export const DocumentType = z.nativeEnum(DocumentTypeEnum);
export type DocumentType = z.infer<typeof DocumentType>;

/**
 * Value contained in a document
 */
export const DocumentValue = z.object({
  digestID: z.coerce.number().optional(),
  random: z.string().optional(),
  elementIdentifier: z.string(),
  elementValue: z.any(),
});

export type DocumentValue = z.infer<typeof DocumentValue>;

/**
 * Issuer Auth Unprotected Header Entry
 */
export const IssuerAuthUnprotectedHeader = z.object({
  algorithm: z.coerce.string().optional(),
  kid: z.string().optional(),
  x5chain: z.array(z.string()).optional(),
});

export type IssuerAuthUnprotectedHeader = z.infer<
  typeof IssuerAuthUnprotectedHeader
>;

/**
 * Issuer Auth Payload Validity Info
 */
export const IssuerAuthPayloadValidityInfo = z.object({
  signed: z.coerce.date(),
  validUntil: z.coerce.date(),
  validFrom: z.coerce.date(),
  expectedUpdate: z.coerce.date().optional(),
});

export type IssuerAuthPayloadValidityInfo = z.infer<
  typeof IssuerAuthPayloadValidityInfo
>;

/**
 * EC KEY
 */
const ECKey = z.object({
  kty: z.enum(['EC']),
  crv: z.enum(['P-256', 'P-384', 'P-521']),
  x: z.string(),
  y: z.string(),
});

/**
 * RSA KEY
 */
const RSAKEY = z.object({
  kty: z.enum(['RSA']),
  alg: z.string(),
  e: z.string(),
  n: z.string(),
});

const PublicKey = z.union([RSAKEY, ECKey]);

/**
 * Issuer Auth Payload Device Key Info
 */
export const IssuerAuthPayloadDeviceKeyInfo = z.object({
  deviceKey: PublicKey,
});

export type IssuerAuthPayloadDeviceKeyInfo = z.infer<
  typeof IssuerAuthPayloadDeviceKeyInfo
>;

/**
 * Issuer Auth Payload Object
 */
export const IssuerAuthPayload = z.object({
  docType: z.string().optional(),
  version: z.string().optional(),
  validityInfo: IssuerAuthPayloadValidityInfo,
  digestAlgorithm: z.string().optional(),
  deviceKeyInfo: IssuerAuthPayloadDeviceKeyInfo,
  valueDigests: z.record(z.string(), z.any()),
});

export type IssuerAuthPayload = z.infer<typeof IssuerAuthPayload>;

/**
 * Issuer Auth Object
 */
export const IssuerAuth = z.object({
  rawValue: z.string().optional(),
  protectedHeader: z.string().optional(),
  unprotectedHeader: IssuerAuthUnprotectedHeader,
  payload: IssuerAuthPayload,
  signature: z.string().optional(),
});

export type IssuerAuth = z.infer<typeof IssuerAuth>;

/**
 * Issuer signed object
 */
export const IssuerSigned = z.object({
  nameSpaces: z.record(z.string(), coerceToJSON.pipe(z.array(DocumentValue))),
  issuerAuth: IssuerAuth,
});

export type IssuerSigned = z.infer<typeof IssuerSigned>;

/**
 * mDOC object
 */
export const MDOC = z.object({
  docType: DocumentType,
  issuerSigned: IssuerSigned,
});

export type MDOC = z.infer<typeof MDOC>;

/**
 * CBOR decoded data containing the status, version and the list of documents
 */
export const Documents = z.object({
  status: z.number().optional(),
  version: z.string().optional(),
  documents: coerceToJSON.pipe(z.array(MDOC)),
});

/**
 * Documents object from string
 */
export const DocumentsFromString = coerceToJSON.pipe(Documents);

/**
 * IssuerSigned object from string
 */
export const IssuerSignedFromString = coerceToJSON.pipe(IssuerSigned);

export type Documents = z.infer<typeof Documents>;
