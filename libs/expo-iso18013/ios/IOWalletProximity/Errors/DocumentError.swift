//
//  DocumentError.swift
//  libIso18013
//
//  Created by Martina D'urso on 04/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

/// Error codes for documents that are not returned
 struct DocumentError {
    
    // Dictionary mapping document types (String) to error codes (UInt64)
    public let documentErrors: [String: UInt64]
    
    // Subscript to access error codes for a given document type
    // - Parameter documentType: The document type
    // - Returns: The associated error code, if available
    public subscript(documentType: String) -> UInt64? { documentErrors[documentType] }
    
    // Initializer for DocumentError
    // - Parameter documentErrors: A dictionary mapping document types to error codes
    public init(documentErrors: [String: UInt64]) {
        self.documentErrors = documentErrors
    }
}

// Extension to make DocumentError conform to CBORDecodable
extension DocumentError: CBORDecodable {
    
    // Initializes a DocumentError from a CBOR object
    // - Parameter cbor: A CBOR object representing the error mapping
    public init?(cbor: CBOR) throws {
        // Ensure the CBOR object is a map (key-value structure)
        guard case let .map(cborMap) = cbor else { return nil }
        
        // Convert the CBOR map to a dictionary of String and UInt64 pairs
        let documentErrorPairs = cborMap.compactMap { (key: CBOR, value: CBOR) -> (String, UInt64)? in
            guard case .utf8String(let documentType) = key else { return nil }      // Ensure the key is a string (DocType)
            guard case .unsignedInt(let errorCode) = value else { return nil }     // Ensure the value is an unsigned integer (ErrorCode)
            return (documentType, errorCode)
        }
        
        // Create a dictionary from the pairs, using the first key in case of conflicts
        let documentErrorDict = Dictionary(documentErrorPairs, uniquingKeysWith: { (first, _) in first })
        
        // Ensure the dictionary is not empty
        if documentErrorDict.count == 0 { return nil }
        
        // Assign the dictionary to documentErrors
        documentErrors = documentErrorDict
    }
}

// Extension to make DocumentError conform to CBOREncodable
extension DocumentError: CBOREncodable {
    
    // Encodes the DocumentError into a CBOR object
    // - Parameter options: Options for encoding CBOR
    // - Returns: A CBOR representation of the DocumentError
    public func toCBOR(options: CBOROptions) -> CBOR {
        // Map the documentErrors dictionary into a CBOR-compatible format
        let mappedErrors = documentErrors.map { (documentType: String, errorCode: UInt64) -> (CBOR, CBOR) in
            (.utf8String(documentType), .unsignedInt(errorCode))
        }
        
        // Return a CBOR map with the mapped values
        return .map(OrderedDictionary(mappedErrors, uniquingKeysWith: { (document, _) in document }))
    }
}
