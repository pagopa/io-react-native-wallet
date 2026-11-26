//
//  LibIso18013Utils.swift
//  libIso18013
//
//  Created by Antonio on 01/10/24.
//

import Foundation
import CryptoKit
internal import SwiftCBOR

// Protocol definition for LibIso18013UtilsProtocol
protocol LibIso18013UtilsProtocol {
    // Decodes a document from a base64-encoded string
    func decodeDocument(base64Encoded: String) throws -> Document
    
    // Decodes a document from raw Data
    func decodeDocument(data: Data) throws -> Document
    
    // Decodes a device document from raw Data and private key
    func decodeDeviceDocument(documentData: Data, privateKeyBase64Encoded: String) throws -> DeviceDocument
    
    // Decodes a device document from a base64-encoded string and private key
    func decodeDeviceDocument(documentBase64Encoded: String, privateKeyBase64Encoded: String) throws -> DeviceDocument
    
    // Checks if the given private key corresponds to the document
    func isDevicePrivateKeyOfDocument(document: Document, privateKey: CoseKeyPrivate) -> Bool
    
    // Checks if the given private key (base64 encoded) corresponds to the document
    func isDevicePrivateKeyOfDocument(document: Document, privateKeyBase64Encoded: String) -> Bool
    
    // Create a new secure private key with requested parameters
    func createSecurePrivateKey(curve: ECCurveName, forceSecureEnclave: Bool) throws -> CoseKeyPrivate
}


class LibIso18013Utils : LibIso18013UtilsProtocol, @unchecked Sendable {
    
    public static let shared = LibIso18013Utils()
    
    // Create a secure private key
    // - Parameters:
    //   - curve: Elliptic Curve Name
    //   - forceSecureEnclave: A boolean indicating if secure enclave must be used
    // - Throws: An error if forceSecureEnclave is enabled and secure enclave is not available or if specified curve is not available in secure enclave
    // - Returns: A CoseKeyPrivate object if creation succeeds
    public func createSecurePrivateKey(curve: ECCurveName = .p256, forceSecureEnclave: Bool = true) throws -> CoseKeyPrivate {
        if forceSecureEnclave {
            if !SecureEnclave.isAvailable {
                throw ErrorHandler.secureEnclaveNotSupported
            }
            
            if curve != .p256 {
                throw ErrorHandler.secureEnclaveNotSupported
            }
        }
        
        if SecureEnclave.isAvailable && curve == .p256 {
            let se256 = try SecureEnclave.P256.KeyAgreement.PrivateKey()
            
            return CoseKeyPrivate(
                publicKeyx963Data: se256.publicKey.x963Representation,
                secureEnclaveKeyID: se256.dataRepresentation)
        }
        
        //if force is disabled and secure enclave is not available use normal key generation
        return CoseKeyPrivate(crv: curve)
    }
    
    // Decodes a device document from raw Data and private key
    // - Parameters:
    //   - documentData: A Data object containing the document data
    //   - privateKeyBase64Encoded: A string containing the base64-encoded private key
    // - Throws: An error if decoding fails
    // - Returns: A DeviceDocument object if decoding succeeds
    public func decodeDeviceDocument(documentData: Data, privateKeyBase64Encoded: String) throws -> DeviceDocument {
        let document = try decodeDocument(data: documentData)
        guard let devicePrivateKeyData = Data(base64Encoded: privateKeyBase64Encoded) else {
            throw ErrorHandler.documentDecodingFailedError
        }
        
        let devicePrivateKey = CoseKeyPrivate(privateKeyx963Data: devicePrivateKeyData)
        
        guard isDevicePrivateKeyOfDocument(document: document, privateKey: devicePrivateKey) else {
            throw ErrorHandler.invalidDeviceKeyError
        }
        
        return DeviceDocument(
            documentData: documentData.bytes,
            issuerSigned: document.issuerSigned.encode(options: CBOROptions()),
            deviceKeyData: devicePrivateKey.encode(options: CBOROptions()),
            state: .issued,
            createdAt: Date(),
            docType: document.docType,
            name: document.docType,
            identifier: UUID().uuidString);
    }
    
    // Decodes a device document from a base64-encoded string and private key
    // - Parameters:
    //   - documentBase64Encoded: A string containing the base64-encoded document data
    //   - privateKeyBase64Encoded: A string containing the base64-encoded private key
    // - Throws: An error if decoding fails
    // - Returns: A DeviceDocument object if decoding succeeds
    public func decodeDeviceDocument(documentBase64Encoded: String, privateKeyBase64Encoded: String) throws -> DeviceDocument {
        let document = try decodeDocument(base64Encoded: documentBase64Encoded)
        guard let devicePrivateKey = CoseKeyPrivate(base64: privateKeyBase64Encoded) else {
            throw ErrorHandler.documentDecodingFailedError
        }
        
        guard isDevicePrivateKeyOfDocument(document: document, privateKey: devicePrivateKey) else {
            throw ErrorHandler.invalidDeviceKeyError
        }
        
        return DeviceDocument(
            documentData: document.encode(options: CBOROptions()),
            issuerSigned: document.issuerSigned.encode(options: CBOROptions()),
            deviceKeyData: devicePrivateKey.encode(options: CBOROptions()),
            state: .issued,
            createdAt: Date(),
            docType: document.docType,
            name: document.docType,
            identifier: UUID().uuidString
            );
    }
    
    // Checks if the provided private key corresponds to the device key in the document
    // - Parameters:
    //   - document: The document containing the issuer's signed data
    //   - privateKey: The private key to be checked
    // - Returns: A boolean indicating whether the private key matches the device key in the document
    public func isDevicePrivateKeyOfDocument(document: Document, privateKey: CoseKeyPrivate) -> Bool {
        guard let devicePublicKeyInDocument = document.issuerSigned.issuerAuth?.mobileSecurityObject.deviceKeyInfo.deviceKey else {
            return false
        }
        
        let devicePublicKey = privateKey.key
        
        return devicePublicKeyInDocument.getx963Representation().base64EncodedData() == devicePublicKey.getx963Representation().base64EncodedData()
    }
    
    // Checks if the provided base64-encoded private key corresponds to the device key in the document
    // - Parameters:
    //   - document: The document containing the issuer's signed data
    //   - privateKeyBase64Encoded: A base64-encoded string representing the private key
    // - Returns: A boolean indicating whether the private key matches the device key in the document
    public func isDevicePrivateKeyOfDocument(document: Document, privateKeyBase64Encoded: String) -> Bool {
        guard let devicePrivateKey = CoseKeyPrivate(base64: privateKeyBase64Encoded) else {
            return false
        }
        
        return isDevicePrivateKeyOfDocument(document: document, privateKey: devicePrivateKey)
    }
    
    
    // Decodes a document from a base64-encoded string
    // - Parameter base64Encoded: A string containing the base64-encoded document data
    // - Throws: An error if decoding fails
    // - Returns: A Document object if decoding succeeds
    public func decodeDocument(base64Encoded: String) throws -> Document {
        guard let documentData = Data(base64Encoded: base64Encoded) else {
            throw ErrorHandler.invalidBase64EncodingError
        }
        return try decodeDocument(data: documentData)
    }
    
    
    // Decodes a document from raw Data
    // - Parameter data: A Data object containing the document data
    // - Throws: An error if decoding fails
    // - Returns: A Document object if decoding succeeds
    public func decodeDocument(data: Data) throws -> Document {
        guard let document = try Document(data: [UInt8](data)) else {
            throw ErrorHandler.documentDecodingFailedError
        }
        return document
    }
}

