//
//  LibIso18013DAOKeyChain.swift
//  libIso18013
//
//  Created by Antonio on 11/10/24.
//
internal import KeychainAccess
internal import SwiftCBOR
import Foundation

public class LibIso18013DAOKeyChain : LibIso18013DAOProtocol {
    
    public init() {
    }
    
    private lazy var keyChain: Keychain = {
        Keychain()
    }()
    
    public func getAllDocuments(state: DeviceDocumentState?) -> [DeviceDocumentProtocol] {
        
        let documents = keyChain.allKeys().compactMap({
            identifier in
            return try? getDocumentByIdentifier(identifier: identifier)
        })
        
        guard let state = state else {
            return documents
        }
        return documents.filter({$0.state == state})
    }
    
    public func getAllMdlDocuments(state: DeviceDocumentState?) -> [DeviceDocumentProtocol] {
        return getAllDocuments(state: state).filter({
            $0.docType == DocType.mDL.rawValue
        })
    }
    
    public func getAllEuPidDocuments(state: DeviceDocumentState?) -> [DeviceDocumentProtocol] {
        return getAllDocuments(state: state).filter({
            $0.docType == DocType.euPid.rawValue
        })
    }
    
    public func getDocumentByIdentifier(identifier: String) throws -> DeviceDocumentProtocol {
        return try _getDocumentByIdentifier(identifier: identifier)
    }
    
    private func _getDocumentByIdentifier(identifier: String) throws -> DeviceDocument {
        guard let documentData = keyChain[data: identifier],
              let document = try DeviceDocument(data: documentData.bytes) else {
            throw ErrorHandler.documentWithIdentifierNotFound
        }
        
        return document
    }
    
    public func deleteDocument(identifier: String) throws -> Bool {
        guard let _ = keyChain[data: identifier] else {
            throw ErrorHandler.documentWithIdentifierNotFound
        }
        
        try keyChain.remove(identifier)
        
        return true
    }
    
    public func createDocument(docType: String, documentName: String/*, curve: ECCurveName = .p256, forceSecureEnclave: Bool = true*/) throws -> DeviceDocumentProtocol {
        
        let deviceKey = try LibIso18013Utils.shared.createSecurePrivateKey(curve: .p256, forceSecureEnclave: true)
        
        return try createDocument(docType: docType, documentName: documentName, deviceKeyData: deviceKey.encode(options: CBOROptions()))
    }
    
    public func createDocument(docType: String, documentName: String, deviceKeyData: [UInt8]) throws -> DeviceDocumentProtocol {
        let document = DeviceDocument(
            documentData: nil,
            issuerSigned: nil,
            deviceKeyData: deviceKeyData,
            state: .unsigned,
            createdAt: Date(),
            docType: docType,
            name: documentName,
            identifier: UUID().uuidString
        )
        
        try keyChain.set(Data(document.encode(options: CBOROptions())), key: document.identifier)
        
        return document
    }
    
    public func storeDocument(identifier: String, documentData: Data) throws -> String {
        
        let storedDocument = (try _getDocumentByIdentifier(identifier: identifier) as DeviceDocument)
        
        
        if storedDocument.state != .unsigned {
            throw ErrorHandler.documentMustBeUnsigned
        }
        
        guard let issuerSigned = try IssuerSigned(data: documentData.bytes) else {
            throw ErrorHandler.documentDecodingFailedError
        }
        
        let document = Document(docType: storedDocument.docType, issuerSigned: issuerSigned)
        
        let deviceKey = try CoseKeyPrivate(data: storedDocument.deviceKeyData)!
        
        guard LibIso18013Utils.shared.isDevicePrivateKeyOfDocument(
            document: document,
            privateKey: deviceKey) else {
            throw ErrorHandler.invalidDeviceKeyError
        }
        
        let issuedDocument = storedDocument.issued(documentData: document.encode(options: CBOROptions()), issuerSigned: document.issuerSigned.encode(options: CBOROptions()))
        
        try keyChain.set(Data(issuedDocument.encode(options: CBOROptions())), key: storedDocument.identifier)
        
        return identifier
    }
    
}
