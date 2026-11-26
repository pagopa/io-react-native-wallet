//
//  ProximityDocument.swift
//  IOWalletProximity
//
//  Created by Antonio Caparello on 01/04/25.
//


import Foundation

//  ProximityDocument is a class to store docType, issuerSigned and deviceKey.
//  It can be initialized in various ways. The only difference is the source of the deviceKey
public class ProximityDocument {
    public var docType: String
    public var issuerSigned: [UInt8]
    internal var deviceKey: CoseKeyPrivate
    
    //Initialize ProximityDocument with a COSEKey CBOR encoded deviceKey
    public convenience init?(docType: String, issuerSigned: [UInt8], deviceKeyRaw: [UInt8]) {
        guard let deviceKey = try? CoseKeyPrivate.init(data: deviceKeyRaw) else {
            return nil
        }
        
        if !ProximityDocument.isIssuerSignedValid(issuerSigned) {
            //issuerSigned decoding failed
            return nil
        }
        
        self.init(docType: docType, issuerSigned: issuerSigned, deviceKey: deviceKey)
    }
    
    //Initialize ProximityDocument with a SecKey deviceKey
    public convenience init?(docType: String, issuerSigned: [UInt8], deviceKeySecKey: SecKey) {
        guard let deviceKey = CoseKeyPrivate.init(crv: .p256, secKey: deviceKeySecKey) else {
            return nil
        }
        
        if !ProximityDocument.isIssuerSignedValid(issuerSigned) {
            //issuerSigned decoding failed
            return nil
        }
        
        
        self.init(docType: docType, issuerSigned: issuerSigned, deviceKey: deviceKey)
    }
    
    
    //Initialize ProximityDocument with a String representing the SecKey in the keychain
    public convenience init?(docType: String, issuerSigned: [UInt8], deviceKeyTag: String) {
        guard let deviceKey = CoseKeyPrivate.init(crv: .p256, keyTag: deviceKeyTag) else {
            return nil
        }
        
        if !ProximityDocument.isIssuerSignedValid(issuerSigned) {
            //issuerSigned decoding failed
            return nil
        }
        
        
        self.init(docType: docType, issuerSigned: issuerSigned, deviceKey: deviceKey)
    }
    
    private static func isIssuerSignedValid(_ issuerSigned: [UInt8]) -> Bool {
        guard let _ = try? IssuerSigned(data: issuerSigned) else {
            return false
        }
        
        return true
    }
    
    private init(docType: String, issuerSigned: [UInt8], deviceKey: CoseKeyPrivate) {
        self.docType = docType
        self.issuerSigned = issuerSigned
        self.deviceKey = deviceKey
    }
}
