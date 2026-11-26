//
//  ErrorHandler.swift
//  libIso18013
//
//  Created by Martina D'urso on 08/10/24.
//

import Foundation

// Error handling class to centralize error messages.
// Conforms to LocalizedError so that `localizedDescription` returns the messages below even when
// the error is type-erased to `Error` (otherwise iOS falls back to "The operation couldn’t be completed. (… error N.)").
public enum ErrorHandler: LocalizedError {
    public var errorDescription: String? {
        switch self {
            case .invalidBase64EncodingError:
                return "Invalid base64 encoding"
            case .documentDecodingFailedError:
                return "Document decoding failed"
            case .invalidDeviceKeyError:
                return "Invalid device key"
            case .secureEnclaveNotSupported:
                return "Secure Enclave not supported on this device"
//            case .secureEnclaveNotSupportedAlgorithm(let algorithm):
//                return "\(algorithm) not supported with Secure Enclave"
            case .documentWithIdentifierNotFound:
                return "No stored document found with this identifier"
            case .documentMustBeUnsigned:
                return "Document must be unsigned"
            case .documents_not_provided:
                return "DOCUMENTS_NOT_PROVIDED"
            case .invalidInputDocument: 
                return "INVALID_INPUT_DOCUMENT"
            case .invalidUrl: 
                return "INVALID_URL"
            case .device_private_key_not_provided: 
                return "DEVICE_PRIVATE_KEY_NOT_PROVIDED"
            case .noDocumentToReturn: 
                return "NO_DOCUMENT_TO_RETURN"
            case .requestDecodeError: 
                return "REQUEST_DECODE_ERROR"
            case .userRejected:
                return "USER_REJECTED"
            case .bleNotAuthorized: 
                return "BLE_NOT_AUTHORIZED"
            case .bleNotSupported: 
                return "BLE_NOT_SUPPORTED"
            case .deviceEngagementMissing: 
                return "DEVICE_ENGAGEMENT_MISSING"
            case .readerKeyMissing: 
                return "READER_KEY_MISSING"
            case .sessionEncryptionNotInitialized: 
                return "SESSION_ENCYPTION_NOT_INITIALIZED"
            case .qrCodePayloadNotFound:
                return "QRCODE_PAYLOAD_NOT_FOUND"
            case .unexpected_error:
                return "GENERIC_ERROR"
        case .digestIdOutOfRange:
            return "DIGEST_ID_OUT_OF_RANGE"
                
        }
    }
    case invalidBase64EncodingError
    case documentDecodingFailedError
    case invalidDeviceKeyError
    
    case secureEnclaveNotSupported
//    case secureEnclaveNotSupportedAlgorithm(algorithm: ECCurveName)
    
    //DAO
    case documentWithIdentifierNotFound
    case documentMustBeUnsigned
    
    //PROXIMITY
    case documents_not_provided
    case invalidInputDocument
    case invalidUrl
    case device_private_key_not_provided
    case noDocumentToReturn
    case userRejected
    case requestDecodeError
    case bleNotAuthorized
    case bleNotSupported
    case unexpected_error
    case sessionEncryptionNotInitialized
    case deviceEngagementMissing
    case readerKeyMissing
    case qrCodePayloadNotFound
    
    case digestIdOutOfRange
    
}
