//
//  DeviceDocument.swift
//  libIso18013
//
//  Created by Antonio on 04/10/24.
//

internal import SwiftCBOR
import Foundation

 struct DeviceDocument : DeviceDocumentProtocol {
    public let documentData: [UInt8]?
     public let issuerSigned: [UInt8]?
    
    public let deviceKeyData: [UInt8]
    
    public let state: DeviceDocumentState
    public let createdAt: Date
    
    
    public let docType: String
    public let name: String
    
    
    public let identifier: String
//    public let document: Document?
    
     public func issued(documentData: [UInt8], issuerSigned: [UInt8]) -> DeviceDocument {
         return DeviceDocument(documentData: documentData, issuerSigned: issuerSigned, deviceKeyData: self.deviceKeyData, state: .issued, createdAt: self.createdAt,  docType: self.docType, name: self.name, identifier: self.identifier)
    }
//    
//    public func coseSign(payloadData: Data, alg: Cose.VerifyAlgorithm) throws-> Cose {
//        return try Cose.makeCoseSign1(payloadData: payloadData, deviceKey: deviceKey, alg: alg)
//    }
}

extension DeviceDocument : CBOREncodable {
    public func toCBOR(options: SwiftCBOR.CBOROptions) -> SwiftCBOR.CBOR {
        
        let documentValue: CBOR = documentData == nil ?
            .null :
            .byteString(documentData!)
        
        let cbor: CBOR = [
            -1: .utf8String(state.rawValue),
             -2: .date(createdAt),
             -3: .byteString(deviceKeyData),
             -4: .utf8String(docType),
             -5: .utf8String(name),
             -6: .utf8String(identifier),
             -7: documentValue
        ]
        return cbor
    }
}

extension DeviceDocument : CBORDecodable {
    public init?(cbor: SwiftCBOR.CBOR) throws {
        guard let stateCBOR = cbor[-1],
              let createdAtCBOR = cbor[-2],
              let deviceKeyCBOR = cbor[-3],
              let docTypeCBOR = cbor[-4],
              let nameCBOR = cbor[-5],
              let identifierCBOR = cbor[-6],
              let documentCBOR = cbor[-7] else {
            return nil
        }
        
        guard case let CBOR.utf8String(stateValue) = stateCBOR,
              case let CBOR.date(createdAtValue) = createdAtCBOR,
              case let CBOR.byteString(deviceKeyValue) = deviceKeyCBOR,
              case let CBOR.utf8String(docTypeValue) = docTypeCBOR,
              case let CBOR.utf8String(nameValue) = nameCBOR,
              case let CBOR.utf8String(identifierValue) = identifierCBOR
        else {
            return nil
        }
        
        guard let state = DeviceDocumentState(rawValue: stateValue) else {
            return nil
        }
        
//        guard let deviceKey = CoseKeyPrivate(data: deviceKeyValue) else {
//            return nil
//        }
        
       
        
        
        
        if case let CBOR.byteString(documentValue) = documentCBOR {
            guard let document = try Document(data: documentValue) else {
                return nil
            }
            self.documentData = documentValue
            self.issuerSigned = document.issuerSigned.encode(options: CBOROptions())
//            self.document = document
        }
        else if case CBOR.null = documentCBOR {
//            self.document = nil
            self.documentData = nil
            self.issuerSigned = nil
        }
        else {
            return nil
        }
        
        self.state = state
        self.createdAt = createdAtValue
        self.docType = docTypeValue
        self.name = nameValue
        self.identifier = identifierValue
//        self.deviceKey = deviceKey
        self.deviceKeyData = deviceKeyValue
    }
    
    
}

public enum DocType : String {
    case euPid = "eu.europa.ec.eudi.pid.1"
    case mDL = "org.iso.18013.5.1.mDL"
}

public enum DeviceDocumentState : String {
    case unsigned = "UNSIGNED"
    case deferred = "DEFERRED"
    case issued = "ISSUED"
}

public protocol DeviceDocumentProtocol {
    var identifier: String { get }
    var state: DeviceDocumentState { get }
    var createdAt: Date { get }
    
    var documentData: [UInt8]? { get }
    var issuerSigned: [UInt8]? { get }
    var deviceKeyData: [UInt8] { get }

//    var document: Document? { get }
//    var deviceKey: CoseKeyPrivate { get }
    
    //DA CAPIRE
    var docType: String { get }
    var name: String { get }
    
}
