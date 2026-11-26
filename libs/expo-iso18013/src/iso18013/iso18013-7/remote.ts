import { IoReactNativeIso18013 } from '..';
import type { AcceptedFields } from '../iso18013-5';
import type { RequestedDocument } from '../types';

/**
 * Generates a CBOR device response for ISO 18013-7 mDL remote presentation using OID4VP.
 * @param clientId - the client id extracted from OID4VP session
 * @param responseUri - the response URI extracted from OID4VP session
 * @param authorizationRequestNonce - the authorization request nonce extracted from OID4VP session
 * @param jwkThumbprint - the base64url-encoded SHA-256 thumbprint (RFC 7638) of the response encryption key, or null for an unencrypted response
 * @param documents - an array of {@link RequestedDocument}
 * @param acceptedFields - a record of claims accepted for disclosure or its stringification extracted from OID4VP session
 * @throws {ModuleError} in case of failure which can be parsed with {@link ModuleErrorSchema}
 * @returns a base64 encoded device response
 */
export const generateOID4VPDeviceResponse = async (
  clientId: string,
  responseUri: string,
  authorizationRequestNonce: string,
  jwkThumbprint: string | null,
  documents: Array<RequestedDocument>,
  acceptedFields: AcceptedFields
): Promise<string> => {
  return await IoReactNativeIso18013.generateOID4VPDeviceResponse(
    clientId,
    responseUri,
    authorizationRequestNonce,
    jwkThumbprint,
    documents,
    acceptedFields
  );
};
