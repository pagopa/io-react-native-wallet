//
//  Document.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

// Struct representing a Document, including its type, issuer-signed data, and optional errors
struct Document {
    
    // The type of document
    public let docType: String
    
    // The issuer-signed data associated with the document
    public let issuerSigned: IssuerSigned
    
    // Optional errors associated with the document
    public let errors: Errors?
    
    public let deviceSigned: DeviceSigned?
    
    // Enum defining keys for CBOR encoding/decoding
    enum Keys: String {
        case docType
        case issuerSigned
        case errors
        case deviceSigned
    }
    
    // Initializer for Document
    // - Parameters:
    //   - docType: The type of the document
    //   - issuerSigned: Issuer-signed data for the document
    //   - errors: Optional Errors associated with the document
    public init(docType: String, issuerSigned: IssuerSigned, deviceSigned: DeviceSigned? = nil, errors: Errors? = nil) {
        self.docType = docType
        self.issuerSigned = issuerSigned
        self.errors = errors
        self.deviceSigned = deviceSigned
        
    }
}

// Extension to make Document conform to CBORDecodable
extension Document: CBORDecodable {
    
    // Initializes a Document from a CBOR object
    // - Parameter cbor: The CBOR object representing the document
    public init?(cbor: CBOR) throws {
        
        // Ensure the CBOR object is a map
        guard case .map(let cborMap) = cbor else {
            return nil
        }
        
        // Extract the document type from the CBOR map
        guard case .utf8String(let docType) = cborMap[Keys.docType] else {
            return nil
        }
        self.docType = docType
        
        // Extract the issuer-signed data from the CBOR map
        guard let cborIssuerSigned = cborMap[Keys.issuerSigned],
              let issuerSigned = try IssuerSigned(cbor: cborIssuerSigned) else {
            return nil
        }
        self.issuerSigned = issuerSigned
        
        //MARK: VALIDATE SIGNATURE?
        //    guard self.issuerSigned.validateSignature() else {
        //      return nil
        //    }
        
        if let cborDeviceSigned = cborMap[Keys.deviceSigned],
           let deviceSigned = try DeviceSigned(cbor: cborDeviceSigned) {
            self.deviceSigned = deviceSigned
        } else {
            deviceSigned = nil
        }
        
        
        
        // Extract the optional errors from the CBOR map
        if let cborErrors = cborMap[Keys.errors],
           let errors = try Errors(cbor: cborErrors) {
            self.errors = errors
        } else {
            self.errors = nil
        }
    }
}

// Extension to make Document conform to CBOREncodable
extension Document: CBOREncodable {
    
    // Encodes the Document into a CBOR object
    // - Parameter options: Encoding options for CBOR
    // - Returns: A CBOR object representing the encoded Document
    public func toCBOR(options: CBOROptions) -> CBOR {
        var cbor = OrderedDictionary<CBOR, CBOR>()
        
        // Add the document type to the CBOR map
        cbor[.utf8String(Keys.docType.rawValue)] = .utf8String(docType)
        
        // Add the issuer-signed data to the CBOR map
        cbor[.utf8String(Keys.issuerSigned.rawValue)] = issuerSigned.toCBOR(options: options)
        
        
        // Add the device-signed data to the CBOR map
        if let deviceSigned = deviceSigned {
            cbor[.utf8String(Keys.deviceSigned.rawValue)] = deviceSigned.toCBOR(options: options)
        }
        
        
        // Add the errors to the CBOR map if they exist
        if let errors {
            cbor[.utf8String(Keys.errors.rawValue)] = errors.toCBOR(options: options)
        }
        
        // Return the encoded CBOR map
        return .map(cbor)
    }
}
