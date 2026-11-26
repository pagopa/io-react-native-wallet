//
//  LibIso18013DAO.swift
//  libIso18013
//
//  Created by Antonio on 10/10/24.
//


/*
 public protocol LibIso18013DAOProtocol2 {
 
 func getAllDocuments(
 _ completed: @escaping (Result<[DeviceDocumentProtocol], ErrorHandler>) -> Void
 )
 
 func getAllMdlDocuments(
 _ completed: @escaping (Result<[DeviceDocumentProtocol], ErrorHandler>) -> Void
 )
 
 func getAllEuPidDocuments(
 _ completed: @escaping (Result<[DeviceDocumentProtocol], ErrorHandler>) -> Void
 )
 
 func getDocumentByIdentifier(
 identifier: String,
 _ completed: @escaping (Result<DeviceDocumentProtocol, ErrorHandler>) -> Void
 )
 
 func deleteDocument(
 identifier: String,
 _ completed: @escaping (Result<Void, ErrorHandler>) -> Void
 )
 
 func createDocument(
 docType: String,
 documentName: String,
 _ completed: @escaping (Result<DeviceDocumentProtocol, ErrorHandler>) -> Void
 )
 
 func storeDocument(
 deviceDocument: DeviceDocumentProtocol,
 documentData: Data,
 _ completed: @escaping (Result<String, ErrorHandler>) -> Void
 ) throws -> String
 }*/

import Foundation

public protocol LibIso18013DAOProtocol {
    
    func getAllDocuments(state: DeviceDocumentState?) -> [DeviceDocumentProtocol]
    
    func getAllMdlDocuments(state: DeviceDocumentState?) -> [DeviceDocumentProtocol]
    
    func getAllEuPidDocuments(state: DeviceDocumentState?) -> [DeviceDocumentProtocol]
    
    func getDocumentByIdentifier(identifier: String) throws -> DeviceDocumentProtocol
    
    func deleteDocument(identifier: String) throws -> Bool
    
    func createDocument(docType: String, documentName: String/*, curve: ECCurveName, forceSecureEnclave: Bool*/) throws -> DeviceDocumentProtocol
    
    //store document data "issuerSigned" inside created unsigned document
    func storeDocument(identifier: String, documentData: Data) throws -> String
    
    
    //needed for tests
    func createDocument(docType: String, documentName: String, deviceKeyData: [UInt8]) throws -> DeviceDocumentProtocol
    
}

