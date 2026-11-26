import { z } from "zod";

import { coerceToJSON } from "./schema.utils";

export enum DocumentTypeEnum {
  EU_PID = "eu.europa.ec.eudi.pid.1",
  MDL = "org.iso.18013.5.1.mDL",
}

export const DocumentType = z.nativeEnum(DocumentTypeEnum);
export type DocumentType = z.infer<typeof DocumentType>;

/**
 * Value contained in a document
 */
export const DocumentValue = z.object({
  digestID: z.coerce.number().optional(),
  elementIdentifier: z.string(),
  elementValue: z.any(),
  random: z.string().optional(),
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
  expectedUpdate: z.coerce.date().optional(),
  signed: z.coerce.date(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
});

export type IssuerAuthPayloadValidityInfo = z.infer<
  typeof IssuerAuthPayloadValidityInfo
>;

/**
 * EC KEY
 */
const ECKey = z.object({
  crv: z.enum(["P-256", "P-384", "P-521"]),
  kty: z.enum(["EC"]),
  x: z.string(),
  y: z.string(),
});

/**
 * RSA KEY
 */
const RSAKEY = z.object({
  alg: z.string(),
  e: z.string(),
  kty: z.enum(["RSA"]),
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
  deviceKeyInfo: IssuerAuthPayloadDeviceKeyInfo,
  digestAlgorithm: z.string().optional(),
  docType: z.string().optional(),
  validityInfo: IssuerAuthPayloadValidityInfo,
  valueDigests: z.record(z.string(), z.any()),
  version: z.string().optional(),
});

export type IssuerAuthPayload = z.infer<typeof IssuerAuthPayload>;

/**
 * Issuer Auth Object
 */
export const IssuerAuth = z.object({
  payload: IssuerAuthPayload,
  protectedHeader: z.string().optional(),
  rawValue: z.string().optional(),
  signature: z.string().optional(),
  unprotectedHeader: IssuerAuthUnprotectedHeader,
});

export type IssuerAuth = z.infer<typeof IssuerAuth>;

/**
 * Issuer signed object
 */
export const IssuerSigned = z.object({
  issuerAuth: IssuerAuth,
  nameSpaces: z.record(z.string(), coerceToJSON.pipe(z.array(DocumentValue))),
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
  documents: coerceToJSON.pipe(z.array(MDOC)),
  status: z.number().optional(),
  version: z.string().optional(),
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
