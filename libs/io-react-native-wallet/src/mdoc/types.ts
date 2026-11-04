import type { PublicKey } from "../utils/crypto";

/**
 * Decoder of CBOR-encoded mdoc data, provided by the consumer.
 * Inputs are base64 or base64url encoded.
 */
export interface CborDecoder {
  /** Decodes generic CBOR data into a JSON object */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decode(data: string): Promise<any>;
  /** Decodes an IssuerSigned structure */
  decodeIssuerSigned(data: string): Promise<IssuerSigned>;
}

/**
 * Verifier of COSE-Sign1 objects, provided by the consumer.
 *
 * @param coseSign1 The COSE-Sign1 object encoded in base64
 * @param publicKey The public key to verify the signature with
 * @returns Whether the signature is valid
 */
export type CborVerifier = (
  coseSign1: string,
  publicKey: PublicKey,
) => Promise<boolean>;

export interface DocumentValue {
  digestID?: number;
  elementIdentifier: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elementValue: any;
  random?: string;
}

export interface IssuerAuth {
  payload: {
    deviceKeyInfo: { deviceKey: PublicKey };
    digestAlgorithm?: string;
    docType?: string;
    validityInfo: {
      expectedUpdate?: Date;
      signed: Date;
      validFrom: Date;
      validUntil: Date;
    };
    valueDigests: Record<string, unknown>;
    version?: string;
  };
  protectedHeader?: string;
  rawValue?: string;
  signature?: string;
  unprotectedHeader: {
    algorithm?: string;
    kid?: string;
    x5chain?: string[];
  };
}

/**
 * The decoded IssuerSigned structure of an mdoc credential.
 */
export interface IssuerSigned {
  issuerAuth: IssuerAuth;
  nameSpaces: Record<string, DocumentValue[]>;
}
