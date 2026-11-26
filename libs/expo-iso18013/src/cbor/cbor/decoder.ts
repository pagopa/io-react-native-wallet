import { IoReactNativeCbor } from '..';
import {
  Documents,
  DocumentsFromString,
  IssuerSigned,
  IssuerSignedFromString,
} from './schema';
import { coerceToJSON } from './schema.utils';

/**
 * Decode base64 or base64url encoded CBOR data to JSON object.
 * This method does not handle nested CBOR data, which will need additional parsing.
 *
 * @param data - The base64 or base64url encoded CBOR string
 * @throws {ModuleError} in case of failure which can be parsed with {@link ModuleErrorSchema}
 * @returns The decoded data as JSON object
 */
export const decode = async (data: string): Promise<any> => {
  const jsonString = await IoReactNativeCbor.decode(data);
  return await coerceToJSON.parseAsync(jsonString);
};

/**
 * Decode base64 or base64url encoded mDOC-CBOR data to a JSON object
 * @param data - The base64 or base64url encoded mDOC-CBOR string
 * @throws {ModuleError} in case of failure which can be parsed with {@link ModuleErrorSchema}
 * @returns The decoded data as mDOC object
 */
export const decodeDocuments = async (data: string): Promise<Documents> => {
  const documentsString = await IoReactNativeCbor.decodeDocuments(data);
  return await DocumentsFromString.parseAsync(documentsString);
};

/**
 * Decode base64 or base64url encoded issuerSigned attribute part of an mDOC-CBOR.
 * @param data - The base64 or base64url encoded mDOC-CBOR containing the issuerSigned
 * @throws {ModuleError} in case of failure which can be parsed with {@link ModuleErrorSchema}
 * @returns The decoded {@link IssuerSigned}
 */
export const decodeIssuerSigned = async (
  data: string
): Promise<IssuerSigned> => {
  const decodedIssuerSignedString =
    await IoReactNativeCbor.decodeIssuerSigned(data);
  return await IssuerSignedFromString.parseAsync(decodedIssuerSignedString);
};
